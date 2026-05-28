
import { GoogleGenAI, Type, GenerateContentResponse, Modality, ThinkingLevel } from "@google/genai";
import { ResumeAnalysis, ChatMessage, InterviewPlaybook, PostingContent, TalentDensityReport, InterviewQuestion, InterviewReport, InterviewType } from "../types";
import JSZip from "jszip";
import { scrubPII } from "../utils/piiScrubber";
import { removeFillerWords } from "../utils/fillerHandler";

import * as pdfjs from 'pdfjs-dist';
import mammoth from 'mammoth';

// Set up PDF.js worker using unpkg for better compatibility with ESM
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const MAX_RETRIES = 3;
const INITIAL_BACKOFF = 1000;

// Helper to reliably extract JSON from markdown code blocks and validate against a simple structure
const safeJsonParse = <T>(text: string | undefined, validator?: (data: any) => data is T): T | null => {
  if (!text) return null;
  try {
    const cleaned = text.replace(/```json\n?|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (validator && !validator(parsed)) {
      console.error("JSON Validation Failed:", parsed);
      return null;
    }
    return parsed;
  } catch (e) {
    console.error("JSON Parse Error:", e);
    return null;
  }
};

/**
 * Smart Truncation: Auto-summarizes documents for specific tasks to reduce token usage.
 */
export const summarizeDocument = async (text: string, task: string = "Extract only Technical Skills and Core Experience"): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [{ text: `TASK: ${task}\n\nDOCUMENT:\n${text.substring(0, 5000)}` }] }],
      config: {
        systemInstruction: "You are a highly efficient document summarizer. Extract only the most relevant information for the specified task. Keep the output under 300 tokens.",
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
      }
    }));
    return response.text.trim();
  } catch (error) {
    console.error("Summarization Error:", error);
    return text.substring(0, 1000); // Fallback to simple truncation
  }
};

const withRetry = async <T>(fn: () => Promise<T>, retries = MAX_RETRIES, delay = INITIAL_BACKOFF): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    console.warn("API Error:", error);
    const isRetryable = error?.message?.includes('503') || error?.message?.includes('429') || error?.message?.includes('overloaded') || error?.message?.includes('fetch failed');
    if (isRetryable && retries > 0) {
      console.log(`Retrying... attempts left: ${retries}`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
};

const fileToGenerativePart = async (file: File) => {
  const base64 = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return { inlineData: { data: base64, mimeType: file.type || 'application/pdf' } };
};

const extractDocxText = async (file: File): Promise<string> => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value;
    } catch (e) {
        console.error("DOCX Parse Error", e);
        return "";
    }
};

const extractPdfText = async (file: File): Promise<string> => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        let fullText = "";
        
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                .map((item: any) => item.str)
                .join(" ");
            fullText += pageText + "\n";
        }
        
        return fullText;
    } catch (e) {
        console.error("PDF Parse Error", e);
        return "";
    }
};

/**
 * Generates audio data for TTS.
 */
export const generateVoiceover = async (text: string): Promise<string | undefined> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    // Calling generateContent directly as per guidelines for simple tts
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Say clearly and professionally: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (e) {
    console.error("Voiceover generation failed:", e);
    return undefined;
  }
};

export const extractTextFromFile = async (file: File): Promise<string> => {
  if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsText(file);
    });
  }

  if (file.name.endsWith('.docx') || file.type.includes('wordprocessingml')) {
      const text = await extractDocxText(file);
      if (text && text.trim().length > 10) return text;
  }

  if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      const text = await extractPdfText(file);
      if (text && text.trim().length > 10) return text;
  }
  
  // Fallback to Gemini for complex/scanned documents
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const filePart = await fileToGenerativePart(file);
  
  const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [{ parts: [filePart, { text: "Extract all text from this document accurately and return only the raw text. Do not add markdown formatting or comments." }] }]
  }));
  return response.text || "";
};

export const extractJobDetails = async (jobDescription: string): Promise<{ company: string, role: string }> => {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: `Extract the company name and the job title/role from the following job description.
        If the company name is not explicitly mentioned, return "Unknown".
        If the role is not explicitly mentioned, return "Unknown".
        Return a JSON object with "company" and "role" fields.
        
        JD:
        ${jobDescription}` }] }],
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    company: { type: Type.STRING },
                    role: { type: Type.STRING }
                },
                required: ["company", "role"]
            }
        }
    }));
    const result = safeJsonParse(response.text) as { company: string, role: string };
    return result || { company: "Unknown", role: "Unknown" };
};

export const analyzeJobDescription = async (jobDescription: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [{ parts: [{ text: `JD:\n---\n${jobDescription}` }] }],
    config: { 
      systemInstruction: 'Analyze the provided job description. Provide 3-5 short, actionable improvement suggestions focused on clarity, inclusivity, and attracting top talent. Format the output as a JSON object with a "suggestions" key containing an array of strings.',
      responseMimeType: "application/json", 
      responseSchema: { 
        type: Type.OBJECT, 
        properties: { 
          suggestions: { type: Type.ARRAY, items: { type: Type.STRING } } 
        },
        required: ["suggestions"]
      } 
    }
  }));
  return (safeJsonParse(response.text) as { suggestions: string[] }) || { suggestions: [] };
};

const analysisCache = new Map<string, ResumeAnalysis>();

const getCacheKey = (jd: string, fileName: string, fileSize: number) => {
    return `${jd.substring(0, 50)}_${fileName}_${fileSize}`;
};

const analyzeSingleResume = async (jobDescription: string, file: File): Promise<ResumeAnalysis> => {
    const cacheKey = getCacheKey(jobDescription, file.name, file.size);
    if (analysisCache.has(cacheKey)) {
        return analysisCache.get(cacheKey)!;
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    let promptPart: any;
    let extractedTextRef = "";

    // Prioritize local text extraction to save tokens (sending text is cheaper than sending files)
    const text = await extractTextFromFile(file);
    if (text && text.trim().length > 10) {
        extractedTextRef = text;
        // Truncate extremely long resumes to save tokens while keeping core info
        const truncatedText = text.length > 15000 ? text.substring(0, 15000) + "...[truncated]" : text;
        promptPart = { text: `RESUME CONTENT:\n${truncatedText}` };
    } else {
        // Fallback for scanned documents
        promptPart = await fileToGenerativePart(file);
        extractedTextRef = "Scanned Document Content";
    }
    
    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview', // Use Flash for maximum speed and lowest token cost
      contents: [{ parts: [promptPart, { text: `Evaluate this resume against the Job Description. Focus on key requirements and experience.
      
      CRITICAL: Ensure the evaluation is objective and free from unconscious bias. Focus strictly on skills, experience, and potential.

      JOB DESCRIPTION: 
      ${jobDescription.substring(0, 5000)}` }] }], // Truncate JD if too long to save tokens
      config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: "application/json",
          responseSchema: {
              type: Type.OBJECT,
              properties: {
                  candidateName: { type: Type.STRING },
                  overallScore: { type: Type.NUMBER },
                  summary: { type: Type.STRING },
                  pros: { type: Type.ARRAY, items: { type: Type.STRING } },
                  cons: { type: Type.ARRAY, items: { type: Type.STRING } },
                  breakdown: {
                      type: Type.OBJECT,
                      properties: {
                          "Relevant Experience": { type: Type.NUMBER },
                          "Technical Skills": { type: Type.NUMBER },
                          "Education": { type: Type.NUMBER },
                          "Soft Skills": { type: Type.NUMBER }
                      },
                      required: ["Relevant Experience", "Technical Skills", "Education", "Soft Skills"]
                  },
                  biasAudit: {
                      type: Type.OBJECT,
                      properties: {
                          score: { type: Type.NUMBER },
                          feedback: { type: Type.STRING },
                          fairnessCheck: { type: Type.STRING }
                      },
                      required: ["score", "feedback", "fairnessCheck"]
                  }
              },
              required: ["candidateName", "overallScore", "summary", "pros", "cons", "breakdown", "biasAudit"]
          }
      }
    }));
    
    const result = safeJsonParse(response.text) as any;
    if (!result) throw new Error("Failed to parse analysis result");
    
    const analysis: ResumeAnalysis = {
        ...result,
        fileName: file.name,
        extractedText: extractedTextRef
    };

    analysisCache.set(cacheKey, analysis);
    return analysis;
};

export const analyzeResumes = async (jobDescription: string, files: File[], onProgress: (count: number, total: number, fileName: string) => void): Promise<ResumeAnalysis[]> => {
  const total = files.length;
  let completed = 0;

  // Process in parallel with a concurrency limit to avoid hitting rate limits while staying fast
  const CONCURRENCY_LIMIT = 3;
  const results: ResumeAnalysis[] = [];
  
  const chunks = [];
  for (let i = 0; i < files.length; i += CONCURRENCY_LIMIT) {
    chunks.push(files.slice(i, i + CONCURRENCY_LIMIT));
  }

  for (const chunk of chunks) {
    const chunkPromises = chunk.map(async (file) => {
        try {
            const result = await analyzeSingleResume(jobDescription, file);
            completed++;
            onProgress(completed, total, file.name);
            return result;
        } catch (e) {
            console.error(`Failed to analyze ${file.name}:`, e);
            completed++;
            onProgress(completed, total, file.name);
            return null;
        }
    });
    
    const chunkResults = await Promise.all(chunkPromises);
    results.push(...chunkResults.filter((r): r is ResumeAnalysis => r !== null));
  }

  return results.sort((a, b) => b.overallScore - a.overallScore);
};

export const generateInitialChatMessage = async (results: ResumeAnalysis[]) => {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const topCandidate = results[0];
    // Explicitly typing response to GenerateContentResponse to fix 'unknown' type error
    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: `Analyze the pool results and greet the user. Mention the top candidate: ${topCandidate?.candidateName}.` }] }]
    }));
    return response.text || "Analysis complete. Ready to discuss the pool.";
};

export const startChatStream = async (jobDescription: string, results: ResumeAnalysis[], history: ChatMessage[], message: string) => {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const context = `You are an AI Recruitment Assistant. Helping with this pool:
    JD: ${jobDescription}
    RESULTS: ${JSON.stringify(results.map(r => ({ name: r.candidateName, score: r.overallScore })))}`;

    const chat = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: { systemInstruction: context }
    });

    return await chat.sendMessageStream({ message });
};

export const generateComparisonReport = async (jobDescription: string, selectedResults: ResumeAnalysis[]) => {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    // Explicitly typing response to GenerateContentResponse to fix 'unknown' type error
    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: `Compare these candidates side-by-side for the role: ${jobDescription}. Candidates: ${JSON.stringify(selectedResults)}` }] }]
    }));
    return response.text || "Comparison unavailable.";
};

export const generateExportReport = async (jobDescription: string, results: ResumeAnalysis[]) => {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    // Explicitly typing response to GenerateContentResponse to fix 'unknown' type error
    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: `Generate an executive report summary for this pool. Pool: ${JSON.stringify(results.slice(0, 5))}` }] }]
    }));
    return response.text || "Report unavailable.";
};

export const generateInterviewPlaybook = async (jobDescription: string, candidate: ResumeAnalysis): Promise<InterviewPlaybook> => {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    // Explicitly typing response to GenerateContentResponse to fix 'unknown' type error
    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: `You are an expert interviewer. Generate an interview playbook for ${candidate.candidateName} for the following role.
        
        JD: ${jobDescription}
        
        Include a strategy and 4 behavioral/situational questions.
        
        CRITICAL GUIDELINES FOR QUESTIONS:
        - The questions should be "smart", professional, and conversational.
        - DO NOT say "The job description states..." or "The company is looking for...".
        - Ask the questions directly as if you are the hiring manager.
        - Focus on behavioral and situational questions that reveal the candidate's true depth and experience.
        - Each question should be tailored specifically to this candidate's background and the role's requirements.
        - The tone should be engaging and professional.` }] }],
        config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    candidateName: { type: Type.STRING },
                    strategy: { type: Type.STRING },
                    questions: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                question: { type: Type.STRING },
                                purpose: { type: Type.STRING },
                                expectedAnswer: { type: Type.STRING }
                            },
                            required: ["question", "purpose", "expectedAnswer"]
                        }
                    }
                },
                required: ["candidateName", "strategy", "questions"]
            }
        }
    }));
    return safeJsonParse(response.text) || { candidateName: candidate.candidateName, strategy: "", questions: [] };
};

export const generateOutreachEmail = async (jobDescription: string, candidate: ResumeAnalysis) => {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    // Explicitly typing response to GenerateContentResponse to fix 'unknown' type error
    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: `Draft a personalized outreach email for ${candidate.candidateName}.` }] }],
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    subject: { type: Type.STRING },
                    body: { type: Type.STRING }
                },
                required: ["subject", "body"]
            }
        }
    }));
    return safeJsonParse(response.text) || { subject: "Opportunity", body: "" };
};

export const generateSourcingQueries = async (jobDescription: string): Promise<string[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: `Analyze this Job Description and generate 3 highly optimized Boolean search strings for sourcing candidates on Google/LinkedIn.
        
        JD:
        ${jobDescription.substring(0, 3000)}
        
        Return a JSON object with a "queries" key containing an array of strings.
        Example: ["(site:linkedin.com/in/) AND \"Senior Engineer\" AND \"AWS\" -jobs", ...]
        ` }] }],
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    queries: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["queries"]
            }
        }
    }));
    const result = safeJsonParse(response.text) as { queries: string[] };
    return result?.queries || [];
};

export const analyzeProfileFromUrl = async (url: string): Promise<File> => {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    // Explicitly typing response to GenerateContentResponse to fix 'unknown' type error
    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: `Extract resume data from this URL: ${url}` }] }]
    }));
    const text = response.text || "Profile extraction failed.";
    return new File([text], "sourced_profile.txt", { type: 'text/plain' });
};

export const generateTalentDensityReport = async (results: ResumeAnalysis[]): Promise<TalentDensityReport> => {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    // Explicitly typing response to GenerateContentResponse to fix 'unknown' type error
    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: `Summarize the overall quality score for this pool. Scores: ${results.map(r => r.overallScore).join(',')}` }] }],
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    talentDensityScore: { type: Type.NUMBER },
                    summary: { type: Type.STRING }
                },
                required: ["talentDensityScore", "summary"]
            }
        }
    }));
    return safeJsonParse(response.text) || { talentDensityScore: 0, summary: "Density analysis unavailable." };
};

export const extractCandidateDetails = async (cvText: string): Promise<{ name: string, email: string }> => {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: `Extract the candidate's full name and email address from the following CV text. 
        Return a JSON object with "name" and "email" fields. 
        If multiple emails are found, pick the most professional one. 
        If no name is found, use "Candidate".
        
        CV TEXT:
        ${cvText}` }] }],
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    email: { type: Type.STRING }
                },
                required: ["name", "email"]
            }
        }
    }));
    const result = (safeJsonParse(response.text) as any) || { name: "", email: "" };
    return result as { name: string, email: string };
};

export const generatePostingContent = async (jobDescription: string): Promise<PostingContent> => {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: `Analyze this Job Description and generate:
        1. 3-5 catchy, optimized job titles.
        2. A concise, engaging social media summary (with hashtags).
        3. A list of 5-10 key skills/keywords.
        
        JD:
        ${jobDescription.substring(0, 3000)}
        
        Return a JSON object with "titles" (array of strings), "summary" (string), and "keywords" (array of strings).
        ` }] }],
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    titles: { type: Type.ARRAY, items: { type: Type.STRING } },
                    summary: { type: Type.STRING },
                    keywords: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["titles", "summary", "keywords"]
            }
        }
    }));
    const result = safeJsonParse(response.text) as PostingContent;
    return result || { titles: [], summary: "", keywords: [] };
};

export const generateInterviewQuestions = async (jd: string, cvText: string, interviewType: InterviewType = 'recruiter', language: string = 'English'): Promise<{ questions: InterviewQuestion[], coreRequirementsMap: string }> => {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    let typeInstructions = "";
    let criticalGuidelines = "";
    if (interviewType === 'consultant') {
        typeInstructions = `
        INTERVIEW TYPE: Recruitment Consultant Screening Call
        OBJECTIVE: Pre-submission fitment and interest check. This is NOT an interview. No competency or technical questions.
        You MUST generate EXACTLY these 8 questions, phrased conversationally for the candidate:
        1. Introduction and initial interest check: "We have an opening for this role (mention role name from JD) at this company (mention company name from JD). Are you interested in proceeding?"
        2. Location & commute fit.
        3. Current CTC and expected CTC.
        4. Notice period.
        5. Earliest possible joining date.
        6. Reason for looking for a change.
        7. Brief summary of experience in their own words.
        8. Why they believe they are a good fit for this role.
        
        Do not generate any other questions.
        `;
        criticalGuidelines = `
        CRITICAL GUIDELINES:
        - Maintain a professional, encouraging, and supportive tone throughout.
        - The questions should be brief, professional, and conversational.
        - DO NOT ask competency or technical questions.
        - Ask the questions directly as if you are the recruiter (e.g., "What are your salary expectations?" or "Are you comfortable commuting to...").
        `;
    } else if (interviewType === 'recruiter') {
        typeInstructions = `
        INTERVIEW TYPE: Recruiter / HR Round
        OBJECTIVE: Mix of competency-based and culture fit. Assess skills and cultural fit.
        FOCUS:
        - Behavioural / STAR-based competency questions tied to the key responsibilities in the JD.
        - Culture fit questions based on the company type and working environment.
        - Avoid generic filler questions.
        - Generate 6-8 questions.
        For each question provide:
        - What a strong answer looks like (2 lines).
        - What a weak answer looks like (2 lines).
        - Scoring rubric: 1-5 scale with descriptors.
        `;
        criticalGuidelines = `
        CRITICAL GUIDELINES:
        - Maintain a professional, encouraging, and supportive tone throughout.
        - The questions should be brief, professional, and conversational.
        - DO NOT say "The job description states..." or "The company is looking for...".
        - Ask the questions directly as if you are the interviewer (e.g., "Tell me about a time when you..." or "How would you handle...").
        - Each question should be a deep dive into a specific skill, experience gap, or strength identified by comparing the JD and Resume.
        - Avoid generic questions; make them highly specific to this candidate and this role.
        `;
    } else if (interviewType === 'functional') {
        typeInstructions = `
        INTERVIEW TYPE: Hiring Manager Round
        OBJECTIVE: Role-specific scenarios and expectations alignment.
        FOCUS:
        - Situational / scenario-based questions specific to this company's stage and context.
        - How they would approach key challenges in the first 90 days.
        - Alignment on working style, decision-making, and expectations from the reporting manager.
        - At least one question that tests whether the candidate understands the business context, not just the function.
        - Generate 6-8 questions.
        For each question provide:
        - What a strong answer looks like (2 lines).
        - What a weak answer looks like (2 lines).
        - Scoring rubric: 1-5 scale with descriptors.
        `;
        criticalGuidelines = `
        CRITICAL GUIDELINES:
        - Maintain a professional, encouraging, and supportive tone throughout.
        - The questions should be brief, professional, and conversational.
        - DO NOT say "The job description states..." or "The company is looking for...".
        - Ask the questions directly as if you are the interviewer (e.g., "Tell me about a time when you..." or "How would you handle...").
        - Each question should be a deep dive into a specific skill, experience gap, or strength identified by comparing the JD and Resume.
        - Avoid generic questions; make them highly specific to this candidate and this role.
        `;
    }

    const summarizedCv = cvText.length > 2000 ? await summarizeDocument(cvText, "Extract only Technical Skills and Core Experience") : cvText;

    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: `Based on the following Job Description and Candidate Resume, generate relevant interview questions.
        
        ${typeInstructions}
        
        LANGUAGE: The interview must be conducted in ${language}. Please generate all questions, purposes, and expected answers in ${language}.
        
        JD:
        ${jd}
        
        RESUME:
        ${summarizedCv}` }] }],
        config: {
            systemInstruction: `You are an expert interviewer. ${criticalGuidelines}`,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    questions: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                question: { type: Type.STRING },
                                purpose: { type: Type.STRING },
                                expectedAnswer: { type: Type.STRING },
                                strongAnswer: { type: Type.STRING },
                                weakAnswer: { type: Type.STRING }
                            },
                            required: ["question", "purpose"]
                        }
                    },
                    coreRequirementsMap: { 
                        type: Type.STRING,
                        description: "A concise 300-token summary of the core requirements from the JD."
                    }
                },
                required: ["questions", "coreRequirementsMap"]
            }
        }
    }));
    const result = safeJsonParse(response.text) as any;
    const questions = result?.questions || [];
    return {
        questions: questions.map((q: any) => ({
            ...q,
            id: Math.random().toString(36).substring(7)
        })),
        coreRequirementsMap: result?.coreRequirementsMap || jd.substring(0, 1000)
    };
};

export const generateNextInterviewQuestion = async (
    coreRequirementsMap: string, 
    cvText: string, 
    previousExchanges: { question: string, answer: string }[],
    totalQuestionsAsked: number,
    interviewType: InterviewType = 'recruiter',
    language: string = 'English'
): Promise<{ question: string, purpose: string, expectedAnswer: string, isFinal: boolean }> => {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    // Limit total questions to 6-8 for token efficiency and candidate experience
    const MAX_QUESTIONS = 6;
    const isFinal = totalQuestionsAsked >= MAX_QUESTIONS - 1;

    let typeContext = "";
    if (interviewType === 'consultant') {
        typeContext = "You are in a Consultant Round (Initial Interest Check). Act as a 'Consultant Twin'. Focus on checking candidate interest, location fit, salary expectations, role alignment, company alignment, and other checks as per the JD. This is a 10-minute round.";
    } else if (interviewType === 'recruiter') {
        typeContext = "You are in a Recruiter Round (Detailed Shortlisting). Be thorough and professional. Focus on role fit, culture fit, experience, and soft skills. This is a 15-minute round.";
    } else if (interviewType === 'functional') {
        typeContext = "You are in a Functional Round (Hiring Manager Technical). Be rigorous and analytical. Focus on deep technical/functional expertise and problem-solving as per the JD.";
    }

    const summarizedCv = cvText.length > 2000 ? await summarizeDocument(cvText, "Extract only Technical Skills and Core Experience") : cvText;

    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: `LANGUAGE: The interview is being conducted in ${language}. Please ensure the 'question' you generate is in ${language}.
        
        CONTEXT:
        CORE REQUIREMENTS MAP: ${coreRequirementsMap}
        RESUME: ${summarizedCv}
        HISTORY: ${JSON.stringify(previousExchanges)}
        TOTAL ASKED: ${totalQuestionsAsked}
        MAX QUESTIONS: ${MAX_QUESTIONS}

        TASK:
        Based on the candidate's last answer and the interview history, generate the NEXT most relevant question.
        - Briefly acknowledge the candidate's response with a positive transition (e.g., "That's a great point," or "Thank you for sharing that") before moving to the next question.
        - If the candidate's last answer was vague, ask a follow-up to drill down politely.
        - If they answered well, move to a new topic from the JD/Resume.
        - Keep the question brief, conversational, and direct.
        - Do not repeat questions.
        - If the candidate explicitly expresses that they are NOT interested in the role or cannot proceed (e.g., "I'm not interested," "I've already accepted another offer"), set "isFinal" to true and provide a polite closing as the "question".
        - If this is the last question (TOTAL ASKED is ${MAX_QUESTIONS - 1}), make it a concluding technical or "any questions for us" type question.

        CRITICAL:
        - Return ONLY JSON.
        - The "question" should be what you speak to the candidate.
        - The "isFinal" flag should be true if this is the absolute last question.` }] }],
        config: {
            systemInstruction: `You are an expert interviewer conducting a live audio interview. Maintain a professional, encouraging, and supportive tone. ${typeContext}`,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    question: { type: Type.STRING },
                    purpose: { type: Type.STRING },
                    expectedAnswer: { type: Type.STRING },
                    isFinal: { type: Type.BOOLEAN }
                },
                required: ["question", "purpose", "expectedAnswer", "isFinal"]
            }
        }
    }));

    const result = safeJsonParse(response.text) as any;
    return {
        question: result?.question || "Could you tell me more about your experience with similar projects?",
        purpose: result?.purpose || "Follow up",
        expectedAnswer: result?.expectedAnswer || "Detailed explanation",
        isFinal: result?.isFinal || isFinal
    };
};

export async function transcribeAndGenerateNextQuestion(
    audioBase64: string,
    mimeType: string,
    coreRequirementsMap: string,
    cvText: string,
    previousExchanges: { question: string, answer: string }[],
    currentQuestion: string,
    totalQuestionsAsked: number,
    interviewType: InterviewType = 'recruiter',
    language: string = 'English',
    nextScheduledQuestion: string | null = null
): Promise<{ 
    transcription: string, 
    nextQuestion: { question: string, purpose: string, expectedAnswer: string, isFinal: boolean },
    vibeAnalysis: { confidence: number, clarity: number, enthusiasm: number }
}> {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const MAX_QUESTIONS = 6;
    const isFinal = totalQuestionsAsked >= MAX_QUESTIONS - 1;

    let typeContext = "";
    if (interviewType === 'consultant') {
        typeContext = "You are in a Consultant Round (Initial Interest Check). Act as a 'Consultant Twin'. Focus on checking candidate interest, location fit, salary expectations, role alignment, company alignment, and other checks as per the JD. This is a 10-minute round.";
    } else if (interviewType === 'recruiter') {
        typeContext = "You are in a Recruiter Round (Detailed Shortlisting). Be thorough and professional. Focus on role fit, culture fit, experience, and soft skills. This is a 15-minute round.";
    } else if (interviewType === 'functional') {
        typeContext = "You are in a Functional Round (Hiring Manager Technical). Be rigorous and analytical. Focus on deep technical/functional expertise and problem-solving as per the JD.";
    }

    const summarizedCv = cvText.length > 2000 ? await summarizeDocument(cvText, "Extract only Technical Skills and Core Experience") : cvText;

    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
            {
                parts: [
                    {
                        inlineData: {
                            data: audioBase64,
                            mimeType: mimeType
                        }
                    },
                    {
                        text: `LANGUAGE: The interview is being conducted in ${language}. Please ensure the 'question' you generate is in ${language}. If the candidate speaks in ${language}, transcribe it correctly.
                        
                        INPUT: The attached audio is the candidate's response to the following question:
                        "${currentQuestion}"
                        
                        CONTEXT:
                        CORE REQUIREMENTS MAP: ${coreRequirementsMap}
                        RESUME: ${summarizedCv}
                        HISTORY OF PREVIOUS EXCHANGES: ${JSON.stringify(previousExchanges)}
                        TOTAL ASKED: ${totalQuestionsAsked}
                        MAX QUESTIONS: ${MAX_QUESTIONS}
 
                        TASK:
                        1. Transcribe the candidate's audio response accurately.
                        2. Based on the transcription and history, determine the NEXT question to ask.
                        - You are an expert interviewer. Your goal is to deeply understand the candidate's capability.
                        - If the candidate's answer is interesting, technical, or needs clarification, PRIORITIZE a follow-up question to probe deeper into their experience.
                        - Only move to a new topic from the JD/Resume if you have sufficiently probed the current topic or if the candidate's answer was comprehensive.
                        - Briefly acknowledge the candidate's response with a positive transition (e.g., "That's a great insight," or "Thank you for that detailed explanation") before asking the next question.
                        ${nextScheduledQuestion 
                            ? `- If you decide to move to a new topic, the next primary question you MUST ask is: "${nextScheduledQuestion}". You may add a brief transition before it, but do not change the core meaning of this question.` 
                            : `- If the candidate's last answer was vague, ask a follow-up to drill down politely.
                               - If they answered well, move to a new topic from the JD/Resume.
                               - Keep the question brief, conversational, and direct.`}
                        - Do not repeat questions.
                        - If the candidate explicitly expresses that they are NOT interested in the role or cannot proceed (e.g., "I'm not interested," "I've already accepted another offer"), set "isFinal" to true and provide a polite closing as the "question".
                        - If this is the last question (TOTAL ASKED is ${MAX_QUESTIONS - 1}), make it a concluding technical or "any questions for us" type question.
                        3. Analyze the candidate's soft skills (confidence, clarity, enthusiasm) based on the audio response.

                        CRITICAL:
                        - Return ONLY JSON.
                        - The "transcription" should be the candidate's words from the audio.
                        - The "question" should be what you speak to the candidate next.
                        - The "isFinal" flag should be true if this is the absolute last question.
                        - The "vibeAnalysis" should contain confidence, clarity, and enthusiasm scores (0-100) for this specific response.`
                    }
                ]
            }
        ],
        config: {
            systemInstruction: `You are an expert interviewer conducting a live audio interview. Maintain a professional, encouraging, and supportive tone. ${typeContext}`,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    transcription: { type: Type.STRING },
                    question: { type: Type.STRING },
                    purpose: { type: Type.STRING },
                    expectedAnswer: { type: Type.STRING },
                    isFinal: { type: Type.BOOLEAN },
                    vibeAnalysis: {
                        type: Type.OBJECT,
                        properties: {
                            confidence: { type: Type.NUMBER },
                            clarity: { type: Type.NUMBER },
                            enthusiasm: { type: Type.NUMBER }
                        },
                        required: ["confidence", "clarity", "enthusiasm"]
                    }
                },
                required: ["transcription", "question", "purpose", "expectedAnswer", "isFinal", "vibeAnalysis"]
            }
        }
    }));

    const result = safeJsonParse(response.text) as any;
    const scrubbedTranscription = scrubPII(removeFillerWords(result?.transcription || "..."));
    return {
        transcription: scrubbedTranscription,
        nextQuestion: {
            question: result?.question || "Could you tell me more about your experience with similar projects?",
            purpose: result?.purpose || "Follow up",
            expectedAnswer: result?.expectedAnswer || "Detailed explanation",
            isFinal: result?.isFinal || isFinal
        },
        vibeAnalysis: result?.vibeAnalysis || { confidence: 70, clarity: 70, enthusiasm: 70 }
    };
};

export const analyzeInterviewResponses = async (coreRequirementsMap: string, cvText: string, responses: { question: string, answer: string }[], interviewType: InterviewType = 'recruiter'): Promise<InterviewReport> => {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const summarizedCv = cvText.length > 2000 ? await summarizeDocument(cvText, "Extract only Technical Skills and Core Experience") : cvText;

    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: `Evaluate the candidate's interview performance with high precision for a ${interviewType} round.
        
        CONTEXT:
        CORE REQUIREMENTS MAP: ${coreRequirementsMap}
        RESUME: ${summarizedCv}
        INTERVIEW: ${JSON.stringify(responses)}
        
        Provide a concise, professional evaluation. Be critical but fair. Status must be "Selected", "Rejected", or "Waitlisted".` }] }],
        config: {
            systemInstruction: `Evaluate the candidate's interview performance with high precision for a ${interviewType} round.
        
        CRITERIA:
        1. Technical Mastery: Depth of knowledge in required stack.
        2. Communication: Clarity, confidence, and structured thinking.
        3. Problem Solving: Approach to challenges and edge cases.
        4. Culture Fit: Alignment with professional standards.

        BIAS AUDIT & FAIRNESS:
        - Perform a rigorous "Bias Audit". 
        - Check for any potential unconscious bias in the evaluation process.
        - Ensure the candidate was evaluated solely on merit and potential.
        - Provide a "Fairness Check" summary that confirms the objectivity of this assessment.
        - Perform a "Compliance Audit" against global hiring regulations (GDPR, EEOC, etc.).
        - Provide a summary of the compliance status and details.

        INTEREST LEVEL ASSESSMENT (CRITICAL for Consultant Round):
        - Evaluate the candidate's interest level for the job.
        - Specifically check and report on:
            - Location Fit: Their comfort with the job location.
            - Salary Alignment: Their expected compensation and if it aligns with the JD.
            - Role Alignment: How well the role matches their career goals.
            - Company Alignment: Their alignment with the company's values and mission.
        - Provide an overall "Interest Level" score (0-100) and feedback.`,
            thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    candidateName: { type: Type.STRING },
                    overallScore: { type: Type.NUMBER },
                    status: { type: Type.STRING, enum: ["Selected", "Rejected", "Waitlisted"] },
                    reason: { type: Type.STRING },
                    parameters: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING },
                                score: { type: Type.NUMBER },
                                feedback: { type: Type.STRING }
                            },
                            required: ["name", "score", "feedback"]
                        }
                    },
                    responses: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                question: { type: Type.STRING },
                                answer: { type: Type.STRING },
                                score: { type: Type.NUMBER },
                                feedback: { type: Type.STRING },
                                evidence: { type: Type.STRING }
                            },
                            required: ["question", "answer", "score", "feedback", "evidence"]
                        }
                    },
                    softSkills: {
                        type: Type.OBJECT,
                        properties: {
                            confidence: { type: Type.NUMBER },
                            clarity: { type: Type.NUMBER },
                            enthusiasm: { type: Type.NUMBER },
                            feedback: { type: Type.STRING }
                        },
                        required: ["confidence", "clarity", "enthusiasm", "feedback"]
                    },
                    biasAudit: {
                        type: Type.OBJECT,
                        properties: {
                            score: { type: Type.NUMBER },
                            feedback: { type: Type.STRING },
                            fairnessCheck: { type: Type.STRING }
                        },
                        required: ["score", "feedback", "fairnessCheck"]
                    },
                    interestLevel: {
                        type: Type.OBJECT,
                        properties: {
                            score: { type: Type.NUMBER },
                            feedback: { type: Type.STRING },
                            locationFit: { type: Type.STRING },
                            salaryAlignment: { type: Type.STRING },
                            roleAlignment: { type: Type.STRING },
                            companyAlignment: { type: Type.STRING }
                        },
                        required: ["score", "feedback", "locationFit", "salaryAlignment", "roleAlignment", "companyAlignment"]
                    }
                },
                required: ["candidateName", "overallScore", "status", "reason", "parameters", "responses", "softSkills", "biasAudit", "interestLevel"]
            }
        }
    }));
    const result = safeJsonParse(response.text) as any;
    if (!result) throw new Error("Failed to analyze interview responses");
    return result as InterviewReport;
};
