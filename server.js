// server.ts
import express from "express";
import path6 from "path";
import { fileURLToPath } from "url";
import { Resend } from "resend";
import * as ics from "ics";
import Stripe from "stripe";
import { jsPDF } from "jspdf";

// services/recruiting/api.ts
import { Router } from "express";

// services/recruiting/aiGateway.ts
var DEFAULT_MODELS = {
  gemini: "gemini-3.6-flash",
  openai: "gpt-4.1-mini",
  anthropic: "claude-3-5-haiku-latest"
};
function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}
async function callGemini(request) {
  const model = request.model || DEFAULT_MODELS.gemini;
  const isGemini3 = /^gemini-3(?:\.|-)/.test(model);
  const generationConfig = {
    maxOutputTokens: request.maxTokens ?? 2e3
  };
  if (!isGemini3) generationConfig.temperature = request.temperature ?? 0.2;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(request.apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: request.system ? { parts: [{ text: request.system }] } : void 0,
      contents: [{ role: "user", parts: [{ text: request.prompt }] }],
      generationConfig
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || `Gemini request failed (${response.status})`);
  const text = cleanText(data?.candidates?.[0]?.content?.parts?.map((part) => part?.text).filter(Boolean).join(""));
  if (!text) throw new Error("Gemini returned an empty response");
  return {
    provider: "gemini",
    model,
    text,
    usage: {
      inputTokens: data?.usageMetadata?.promptTokenCount,
      outputTokens: data?.usageMetadata?.candidatesTokenCount
    }
  };
}
async function callOpenAI(request) {
  const model = request.model || DEFAULT_MODELS.openai;
  const messages = [
    ...request.system ? [{ role: "system", content: request.system }] : [],
    { role: "user", content: request.prompt }
  ];
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${request.apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: request.temperature ?? 0.2,
      max_tokens: request.maxTokens ?? 2e3
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || `OpenAI request failed (${response.status})`);
  const text = cleanText(data?.choices?.[0]?.message?.content);
  if (!text) throw new Error("OpenAI returned an empty response");
  return {
    provider: "openai",
    model,
    text,
    usage: {
      inputTokens: data?.usage?.prompt_tokens,
      outputTokens: data?.usage?.completion_tokens
    }
  };
}
async function callAnthropic(request) {
  const model = request.model || DEFAULT_MODELS.anthropic;
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": request.apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model,
      max_tokens: request.maxTokens ?? 2e3,
      temperature: request.temperature ?? 0.2,
      system: request.system,
      messages: [{ role: "user", content: request.prompt }]
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || `Anthropic request failed (${response.status})`);
  const text = cleanText(data?.content?.filter((item) => item?.type === "text").map((item) => item.text).join(""));
  if (!text) throw new Error("Anthropic returned an empty response");
  return {
    provider: "anthropic",
    model,
    text,
    usage: {
      inputTokens: data?.usage?.input_tokens,
      outputTokens: data?.usage?.output_tokens
    }
  };
}
async function generateAI(request) {
  if (!request.apiKey) throw new Error("AI provider credential is not configured");
  if (!request.prompt?.trim()) throw new Error("AI prompt is required");
  switch (request.provider) {
    case "gemini":
      return callGemini(request);
    case "openai":
      return callOpenAI(request);
    case "anthropic":
      return callAnthropic(request);
    default:
      throw new Error(`Unsupported AI provider: ${String(request.provider)}`);
  }
}

// services/recruiting/jdAgent.ts
async function analyzeJD(jdText, provider, apiKey, model) {
  const prompt = `Analyze this job description for a recruiting operating system. Return ONLY valid JSON matching this schema: {"title":string,"description":string,"mustHave":string[],"niceToHave":string[],"location":string|null,"experienceMin":number|null,"experienceMax":number|null,"compensationMin":number|null,"compensationMax":number|null,"department":string|null,"competencies":string[],"interviewFocus":string[],"sourcingKeywords":string[],"redFlags":string[],"questions":string[]}. Do not invent compensation if absent. Extract measurable requirements and separate must-have from nice-to-have.

JD:
${jdText}`;
  const result = await generateAI({
    provider,
    apiKey,
    model,
    system: "You are Smart Scout Job Intelligence. Be conservative and evidence based. Never fabricate missing requirements.",
    prompt,
    temperature: 0,
    maxTokens: 3500
  });
  const cleaned = result.text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("Gemini returned an invalid hiring blueprint. Please retry the JD request.");
  }
  if (!parsed.title || !parsed.description) throw new Error("Gemini returned an incomplete hiring blueprint. Please retry the JD request.");
  return parsed;
}

// services/recruiting/candidateScoring.ts
async function scoreCandidate(candidate, requirement, provider, apiKey, model) {
  const prompt = `Score this candidate against the hiring requirement. Return ONLY JSON: {"overall":number,"experience":number,"skills":number,"roleFit":number,"leadership":number,"compensationFit":number,"availabilityFit":number,"strengths":string[],"concerns":string[],"evidence":[{"source":string,"field":string,"value":string,"confidence":number,"capturedAt":string}],"recommendation":"strong_yes|yes|maybe|no"}. Scores 0-100. Use only evidence supplied. Do not infer protected characteristics.

REQUIREMENT:
${JSON.stringify(requirement)}

CANDIDATE:
${JSON.stringify(candidate)}`;
  const response = await generateAI({ provider, apiKey, model, system: "You are an explainable recruiting scorer. Never use protected characteristics. Cite evidence.", prompt, temperature: 0, maxTokens: 3500 });
  const cleaned = response.text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  const score = JSON.parse(cleaned);
  return {
    ...score,
    overall: Math.max(0, Math.min(100, Number(score.overall) || 0)),
    strengths: Array.isArray(score.strengths) ? score.strengths : [],
    concerns: Array.isArray(score.concerns) ? score.concerns : [],
    evidence: Array.isArray(score.evidence) ? score.evidence : []
  };
}

// services/recruiting/interview.ts
function buildInterviewPlan(role, competencies) {
  const topics = (competencies.length ? competencies : ["role expertise", "problem solving", "stakeholder management", "leadership"]).slice(0, 8);
  return {
    durationMinutes: Math.min(30, 8 + topics.length * 3),
    intro: `Hello. This structured Smart Scout interview is for the ${role} role. We will ask questions about the role requirements and your experience.`,
    closing: "Thank you. Your responses will be reviewed against the role requirements.",
    questions: topics.map((topic, index) => ({
      id: `q${index + 1}`,
      competency: topic,
      question: `Tell us about a specific example that demonstrates your strength in ${topic}. What was the context, what did you personally do, and what was the measurable outcome?`,
      followUp: "What would you do differently next time?",
      scoringRubric: "Score evidence, ownership, complexity, reasoning and measurable outcome from 0-100. Do not score protected characteristics."
    }))
  };
}

// services/recruiting/decision.ts
function makeHiringDecision(input) {
  const resumeWeight = input.interview ? 0.55 : 0.8;
  const interviewWeight = input.interview ? 0.45 : 0.2;
  const interviewScore = input.interview?.overall ?? input.resume.overall;
  const score = Math.round(input.resume.overall * resumeWeight + interviewScore * interviewWeight);
  const adjusted = typeof input.roleFitOverride === "number" ? Math.round(score * 0.8 + input.roleFitOverride * 0.2) : score;
  const recommendation = adjusted >= 90 ? "strong_yes" : adjusted >= 80 ? "yes" : adjusted >= 65 ? "maybe" : "no";
  const reasons = [...input.resume.strengths.slice(0, 3)];
  if (input.interview) reasons.push(...input.interview.strengths.slice(0, 2).map((reason) => `Interview: ${reason}`));
  reasons.push(...input.resume.concerns.slice(0, 2).map((reason) => `Concern: ${reason}`));
  return { score: adjusted, recommendation, reasons, approvalRequired: true };
}

// services/recruiting/compensation.ts
var percentile = (values, p) => {
  if (!values.length) return void 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
};
function recommendCompensation(observations, internalComparable) {
  const medians = observations.map((o) => o.totalMedian ?? o.cashMedian).filter((v) => typeof v === "number" && v > 0);
  const bases = observations.map((o) => o.cashMedian).filter((v) => typeof v === "number" && v > 0);
  const marketP25 = percentile(medians, 0.25);
  const marketP50 = percentile(medians, 0.5);
  const marketP75 = percentile(medians, 0.75);
  const baseP50 = percentile(bases, 0.5) ?? marketP50 ?? internalComparable ?? 0;
  const blended = marketP50 && internalComparable ? marketP50 * 0.65 + internalComparable * 0.35 : marketP50 ?? internalComparable ?? 0;
  const recommendedBase = Math.round((baseP50 || blended) * 100) / 100;
  const recommendedTotal = Math.round(blended * 100) / 100;
  return {
    currency: observations[0]?.currency || "INR",
    marketP25,
    marketP50,
    marketP75,
    internalP50: internalComparable,
    recommendedBase,
    recommendedTotal,
    confidence: Math.min(0.95, 0.45 + observations.length * 0.05),
    rationale: [
      "Balances market benchmark evidence with internal parity when available.",
      internalComparable ? "Internal comparable compensation was included." : "No internal comparable was supplied.",
      `${observations.length} compensation observations contributed to the recommendation.`
    ],
    sourceCount: observations.length
  };
}

// services/recruiting/lifecycle.ts
function createOffer(input) {
  return { ...input, status: "pending_approval", generatedAt: (/* @__PURE__ */ new Date()).toISOString() };
}
var OFFER_TRANSITIONS = {
  draft: ["pending_approval"],
  pending_approval: ["approved", "declined"],
  approved: ["sent", "declined"],
  sent: ["accepted", "declined"],
  accepted: [],
  declined: []
};
function transitionOffer(input, nextStatus) {
  if (!OFFER_TRANSITIONS[input.status]?.includes(nextStatus)) throw new Error(`Invalid offer transition: ${input.status} \u2192 ${nextStatus}`);
  return { ...input, status: nextStatus, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
}
function buildEngagementPlan(candidateName) {
  return [
    { id: "welcome", timing: "Immediately after acceptance", channel: "email", subject: `Welcome to the team, ${candidateName}`, objective: "Confirm acceptance and establish a warm relationship.", required: true },
    { id: "manager_intro", timing: "T-21 days", channel: "calendar", subject: "Manager introduction", objective: "Create an early connection with the hiring manager.", required: true },
    { id: "docs", timing: "T-14 days", channel: "task", subject: "Preboarding documents", objective: "Collect and validate required documents.", required: true },
    { id: "culture", timing: "T-7 days", channel: "email", subject: "Your first week at the company", objective: "Reduce first-day uncertainty and improve readiness.", required: false },
    { id: "joining", timing: "T-1 day", channel: "email", subject: "Tomorrow is your first day", objective: "Confirm joining logistics.", required: true }
  ];
}
function buildOnboardingPlan(input) {
  const start = input.startDate || "TBD";
  return {
    role: input.role,
    startDate: input.startDate,
    manager: input.manager,
    steps: [
      { id: "hris", due: "Before start", owner: "HR", task: "Create employee record in customer HRIS", system: "HRIS API" },
      { id: "it", due: "Before start", owner: "IT", task: "Provision identity, laptop and access" },
      { id: "manager", due: "Day 1", owner: input.manager || "Hiring Manager", task: "Run manager onboarding and role briefing" },
      { id: "team", due: "Day 1", owner: input.manager || "Hiring Manager", task: "Introduce candidate to team" },
      { id: "30-60-90", due: "First week", owner: input.manager || "Hiring Manager", task: "Agree 30/60/90 day plan" }
    ],
    hrisPayload: { name: input.candidateName, jobTitle: input.role, department: input.department, location: input.location, manager: input.manager, startDate: start }
  };
}

// services/recruiting/webSourcing.ts
function cleanJson(text) {
  return text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
}
function hostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
async function searchWebCandidates(apiKey, role, limit = 8) {
  const prompt = `Find real public professional profiles suitable for this hiring role using Google Search. Return ONLY JSON, no markdown: {"candidates":[{"name":string,"headline":string,"location":string,"profileUrl":string,"source":string,"summary":string,"evidence":string[]}]}. Do not invent people, URLs, employers, or evidence. Only include candidates whose public profile/search result provides enough evidence to justify relevance. Prefer LinkedIn and credible public professional pages. Every candidate MUST have a real public profileUrl, a source hostname or publisher, and at least one concrete evidence item tied to the role. Maximum ${limit} candidates. ROLE: ${JSON.stringify(role)}`;
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], tools: [{ google_search: {} }], generationConfig: { temperature: 0.1, maxOutputTokens: 5e3 } })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || `Candidate search failed (${response.status})`);
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p?.text).filter(Boolean).join("") || "";
  const parsed = JSON.parse(cleanJson(text));
  const seen = /* @__PURE__ */ new Set();
  return (Array.isArray(parsed?.candidates) ? parsed.candidates : []).map((c) => ({ ...c, profileUrl: String(c?.profileUrl || "").trim(), source: String(c?.source || "").trim() || hostname(String(c?.profileUrl || "")), evidence: Array.isArray(c?.evidence) ? c.evidence.map((x) => String(x).trim()).filter(Boolean) : [] })).filter((c) => {
    const key = c.profileUrl.toLowerCase();
    if (!c.name || !key || !c.source || !c.evidence.length || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, limit);
}

// services/recruiting/credentialStore.ts
import { createClient } from "@supabase/supabase-js";

// services/recruiting/credentialVault.ts
import * as crypto from "crypto";
function getVaultKey() {
  const explicit = process.env.SMARTSCOUT_VAULT_KEY;
  if (explicit) {
    const key = Buffer.from(explicit, "base64");
    if (key.length !== 32) throw new Error("SMARTSCOUT_VAULT_KEY must be a base64-encoded 32-byte key");
    return key;
  }
  const rootSecret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.GEMINI_API_KEY;
  if (!rootSecret) throw new Error("No server secret is available for credential encryption");
  return crypto.createHash("sha256").update(`smartscout:vault:${rootSecret}`).digest();
}
function encryptCredential(credential, tenantId2, provider) {
  if (!credential || credential.length < 8) throw new Error("Credential is invalid");
  const key = getVaultKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(`${tenantId2}:${provider}`));
  const ciphertext = Buffer.concat([cipher.update(credential, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const now2 = (/* @__PURE__ */ new Date()).toISOString();
  return { tenantId: tenantId2, provider, ciphertext: ciphertext.toString("base64"), iv: iv.toString("base64"), tag: tag.toString("base64"), createdAt: now2, updatedAt: now2 };
}
function decryptCredential(stored) {
  const key = getVaultKey();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(stored.iv, "base64"));
  decipher.setAAD(Buffer.from(`${stored.tenantId}:${stored.provider}`));
  decipher.setAuthTag(Buffer.from(stored.tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(stored.ciphertext, "base64")), decipher.final()]).toString("utf8");
}

// services/recruiting/credentialStore.ts
function getAdminClient() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("Supabase server credentials are not configured");
  return createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
function asStored(row) {
  return {
    tenantId: row.tenant_id,
    provider: row.provider,
    ciphertext: row.ciphertext,
    iv: row.iv,
    tag: row.tag,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
async function saveAICredential(tenantId2, provider, apiKey) {
  if (!tenantId2) throw new Error("tenantId is required");
  const encrypted = encryptCredential(apiKey, tenantId2, provider);
  const { error } = await getAdminClient().from("tenant_ai_credentials").upsert({
    tenant_id: encrypted.tenantId,
    provider: encrypted.provider,
    ciphertext: encrypted.ciphertext,
    iv: encrypted.iv,
    tag: encrypted.tag,
    updated_at: encrypted.updatedAt
  }, { onConflict: "tenant_id,provider" });
  if (error) throw new Error(`Unable to store AI credential: ${error.message}`);
  return { tenantId: tenantId2, provider, updatedAt: encrypted.updatedAt };
}
async function getAICredential(tenantId2, provider) {
  const { data, error } = await getAdminClient().from("tenant_ai_credentials").select("tenant_id,provider,ciphertext,iv,tag,created_at,updated_at").eq("tenant_id", tenantId2).eq("provider", provider).maybeSingle();
  if (error) throw new Error(`Unable to load AI credential: ${error.message}`);
  return data ? decryptCredential(asStored(data)) : null;
}
async function deleteAICredential(tenantId2, provider) {
  const { error } = await getAdminClient().from("tenant_ai_credentials").delete().eq("tenant_id", tenantId2).eq("provider", provider);
  if (error) throw new Error(`Unable to delete AI credential: ${error.message}`);
}
async function listAIProviders(tenantId2) {
  const { data, error } = await getAdminClient().from("tenant_ai_credentials").select("provider").eq("tenant_id", tenantId2);
  if (error) throw new Error(`Unable to list AI credentials: ${error.message}`);
  return Array.from(new Set((data || []).map((row) => row.provider)));
}

// services/recruiting/jobStore.ts
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto2 from "node:crypto";
var filePath = process.env.SMARTSCOUT_JOB_STORE || path.join(process.cwd(), ".smartscout-jobs.json");
var writeQueue = Promise.resolve();
async function readAll() {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return [];
  }
}
async function createJob(tenantId2, prompt, analysis) {
  const now2 = (/* @__PURE__ */ new Date()).toISOString();
  const job = { id: `job_${crypto2.randomUUID()}`, tenantId: tenantId2, prompt, analysis, createdAt: now2, updatedAt: now2 };
  writeQueue = writeQueue.then(async () => {
    const jobs = await readAll();
    jobs.unshift(job);
    await fs.writeFile(filePath, JSON.stringify(jobs.slice(0, 500), null, 2), "utf8");
  });
  await writeQueue;
  return job;
}
async function getJob(tenantId2, id) {
  return (await readAll()).find((job) => job.tenantId === tenantId2 && job.id === id) || null;
}
async function listJobs(tenantId2) {
  return (await readAll()).filter((job) => job.tenantId === tenantId2);
}

// services/recruiting/candidateStore.ts
import { promises as fs2 } from "node:fs";
import path2 from "node:path";
import crypto3 from "node:crypto";
var filePath2 = process.env.SMARTSCOUT_CANDIDATE_STORE || path2.join(process.cwd(), ".smartscout-candidates.json");
var writeQueue2 = Promise.resolve();
async function readAll2() {
  try {
    return JSON.parse(await fs2.readFile(filePath2, "utf8"));
  } catch {
    return [];
  }
}
async function saveCandidates(tenantId2, jobId, candidates) {
  const now2 = (/* @__PURE__ */ new Date()).toISOString();
  const saved = candidates.map((candidate) => ({ id: `candidate_${crypto3.randomUUID()}`, tenantId: tenantId2, jobId, candidate, createdAt: now2, updatedAt: now2 }));
  writeQueue2 = writeQueue2.then(async () => {
    const all = await readAll2();
    const kept = all.filter((x) => !(x.tenantId === tenantId2 && x.jobId === jobId));
    await fs2.writeFile(filePath2, JSON.stringify([...saved, ...kept].slice(0, 5e3), null, 2), "utf8");
  });
  await writeQueue2;
  return saved;
}
async function listCandidates(tenantId2, jobId) {
  return (await readAll2()).filter((x) => x.tenantId === tenantId2 && x.jobId === jobId);
}
async function updateCandidateScore(tenantId2, id, score) {
  const all = await readAll2();
  const index = all.findIndex((x) => x.tenantId === tenantId2 && x.id === id);
  if (index < 0) return null;
  all[index] = { ...all[index], score, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
  await fs2.writeFile(filePath2, JSON.stringify(all, null, 2), "utf8");
  return all[index];
}

// services/recruiting/interviewStore.ts
import { promises as fs3 } from "node:fs";
import path3 from "node:path";
import crypto4 from "node:crypto";
var filePath3 = process.env.SMARTSCOUT_INTERVIEW_STORE || path3.join(process.cwd(), ".smartscout-interviews.json");
var writeQueue3 = Promise.resolve();
async function readAll3() {
  try {
    return JSON.parse(await fs3.readFile(filePath3, "utf8"));
  } catch {
    return [];
  }
}
async function writeAll(items) {
  await fs3.writeFile(filePath3, JSON.stringify(items.slice(0, 5e3), null, 2), "utf8");
}
async function createInterview(tenantId2, jobId, candidateId, plan) {
  const now2 = (/* @__PURE__ */ new Date()).toISOString();
  const interview = {
    id: `interview_${crypto4.randomUUID()}`,
    tenantId: tenantId2,
    jobId,
    candidateId,
    plan,
    answers: [],
    status: "planned",
    createdAt: now2,
    updatedAt: now2
  };
  writeQueue3 = writeQueue3.then(async () => {
    const all = await readAll3();
    await writeAll([interview, ...all.filter((x) => !(x.tenantId === tenantId2 && x.jobId === jobId && x.candidateId === candidateId))]);
  });
  await writeQueue3;
  return interview;
}
async function getInterview(tenantId2, interviewId) {
  return (await readAll3()).find((x) => x.tenantId === tenantId2 && x.id === interviewId) || null;
}
async function listInterviews(tenantId2, jobId) {
  return (await readAll3()).filter((x) => x.tenantId === tenantId2 && x.jobId === jobId);
}
async function recordInterviewAnswer(tenantId2, interviewId, questionId, answer) {
  const all = await readAll3();
  const index = all.findIndex((x) => x.tenantId === tenantId2 && x.id === interviewId);
  if (index < 0) return null;
  const existing = all[index];
  all[index] = {
    ...existing,
    answers: [...existing.answers, { questionId, answer, capturedAt: (/* @__PURE__ */ new Date()).toISOString() }],
    status: "in_progress",
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await writeAll(all);
  return all[index];
}
async function completeInterview(tenantId2, interviewId, evidence) {
  const all = await readAll3();
  const index = all.findIndex((x) => x.tenantId === tenantId2 && x.id === interviewId);
  if (index < 0) return null;
  all[index] = { ...all[index], evidence, status: "completed", updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
  await writeAll(all);
  return all[index];
}

// services/recruiting/hiringStateStore.ts
import { promises as fs4 } from "node:fs";
import path4 from "node:path";
import crypto5 from "node:crypto";
var filePath4 = process.env.SMARTSCOUT_HIRING_STATE_STORE || path4.join(process.cwd(), ".smartscout-hiring-state.json");
var writeQueue4 = Promise.resolve();
async function readAll4() {
  try {
    return JSON.parse(await fs4.readFile(filePath4, "utf8"));
  } catch {
    return [];
  }
}
async function saveHiringState(tenantId2, jobId, type, payload, candidateId) {
  const now2 = (/* @__PURE__ */ new Date()).toISOString();
  const state = { id: `state_${crypto5.randomUUID()}`, tenantId: tenantId2, jobId, candidateId, type, payload, createdAt: now2, updatedAt: now2 };
  writeQueue4 = writeQueue4.then(async () => {
    const all = await readAll4();
    all.unshift(state);
    await fs4.writeFile(filePath4, JSON.stringify(all.slice(0, 2e3), null, 2), "utf8");
  });
  await writeQueue4;
  return state;
}
async function listHiringStates(tenantId2, jobId, type) {
  const all = await readAll4();
  return all.filter((x) => x.tenantId === tenantId2 && x.jobId === jobId && (!type || x.type === type));
}

// services/recruiting/api.ts
var router = Router();
var sessions = /* @__PURE__ */ new Map();
function tenantId(req) {
  return String(req.header("x-tenant-id") || "demo-tenant");
}
async function getCredential(req) {
  const tenant = tenantId(req);
  const session = sessions.get(tenant);
  if (session) return session;
  if (process.env.GEMINI_API_KEY) {
    const c = { provider: "gemini", apiKey: process.env.GEMINI_API_KEY, model: "gemini-3.6-flash" };
    sessions.set(tenant, c);
    return c;
  }
  const providers = await listAIProviders(tenant).catch(() => []);
  const provider = providers[0];
  if (provider) {
    const apiKey = await getAICredential(tenant, provider);
    if (apiKey) {
      const c = { provider, apiKey, model: provider === "gemini" ? "gemini-3.6-flash" : void 0 };
      sessions.set(tenant, c);
      return c;
    }
  }
  throw new Error("Connect an AI provider first");
}
router.get("/health", (_req, res) => res.json({ ok: true, service: "recruiting-os" }));
router.post("/ai/connect", async (req, res) => {
  try {
    const { provider, apiKey, model } = req.body || {};
    if (!["gemini", "openai", "anthropic"].includes(provider)) return res.status(400).json({ error: "Unsupported provider" });
    const credential = String(apiKey || "").trim();
    if (!credential) return res.status(400).json({ error: "API key is required" });
    const selectedModel = model || (provider === "gemini" ? "gemini-3.6-flash" : void 0);
    await generateAI({ provider, apiKey: credential, model: selectedModel, system: "Reply with OK only.", prompt: "OK", temperature: 0, maxTokens: 8 });
    const tenant = tenantId(req);
    await saveAICredential(tenant, provider, credential);
    sessions.set(tenant, { provider, apiKey: credential, model: selectedModel });
    res.json({ connected: true, provider, model: selectedModel });
  } catch (error) {
    res.status(400).json({ error: error?.message || "Unable to connect AI provider" });
  }
});
router.get("/ai/status", async (req, res) => {
  try {
    const tenant = tenantId(req);
    const session = sessions.get(tenant);
    if (session) return res.json({ connected: true, provider: session.provider, model: session.model, source: "secure-vault" });
    if (process.env.GEMINI_API_KEY) return res.json({ connected: true, provider: "gemini", model: "gemini-3.6-flash", source: "server-environment" });
    const providers = await listAIProviders(tenant).catch(() => []);
    if (providers[0]) return res.json({ connected: true, provider: providers[0], model: providers[0] === "gemini" ? "gemini-3.6-flash" : void 0, source: "secure-vault" });
    res.json({ connected: false, provider: null, model: null });
  } catch (error) {
    res.status(500).json({ error: error?.message || "Unable to read AI status" });
  }
});
router.delete("/ai/disconnect", async (req, res) => {
  const tenant = tenantId(req);
  sessions.delete(tenant);
  try {
    await deleteAICredential(tenant, "gemini");
    await deleteAICredential(tenant, "openai");
    await deleteAICredential(tenant, "anthropic");
  } catch {
  }
  res.json({ disconnected: true });
});
router.post("/jd/analyze", async (req, res) => {
  try {
    const c = await getCredential(req);
    const prompt = String(req.body?.text || "");
    if (!prompt.trim()) return res.status(400).json({ error: "Hiring prompt is required" });
    const analysis = await analyzeJD(prompt, c.provider, c.apiKey, c.model);
    const job = await createJob(tenantId(req), prompt, analysis);
    res.json({ ...analysis, jobId: job.id, job });
  } catch (error) {
    res.status(400).json({ error: error?.message || "JD analysis failed" });
  }
});
router.get("/jobs", async (req, res) => {
  try {
    res.json({ jobs: await listJobs(tenantId(req)) });
  } catch (error) {
    res.status(500).json({ error: error?.message || "Unable to list jobs" });
  }
});
router.get("/jobs/:id", async (req, res) => {
  try {
    const job = await getJob(tenantId(req), String(req.params.id));
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json(job);
  } catch (error) {
    res.status(500).json({ error: error?.message || "Unable to load job" });
  }
});
router.post("/source/search", async (req, res) => {
  try {
    const c = await getCredential(req);
    const role = req.body?.role || {};
    const jobId = role.jobId || req.body?.jobId;
    if (!jobId) return res.status(400).json({ error: "jobId is required before sourcing" });
    const candidates = await searchWebCandidates(c.apiKey, role, Number(req.body?.limit) || 8);
    const saved = await saveCandidates(tenantId(req), String(jobId), candidates);
    res.json({ jobId, candidates, savedCandidates: saved });
  } catch (error) {
    res.status(400).json({ error: error?.message || "Candidate sourcing failed" });
  }
});
router.get("/jobs/:id/candidates", async (req, res) => {
  try {
    res.json({ candidates: await listCandidates(tenantId(req), String(req.params.id)) });
  } catch (error) {
    res.status(500).json({ error: error?.message || "Unable to list candidates" });
  }
});
router.post("/candidate/score", async (req, res) => {
  try {
    const { candidate, requirement, jobId, candidateId } = req.body || {};
    if (!candidate || !requirement) return res.status(400).json({ error: "candidate and requirement are required" });
    const c = await getCredential(req);
    const score = await scoreCandidate(candidate, requirement, c.provider, c.apiKey, c.model);
    if (jobId && candidateId) await updateCandidateScore(tenantId(req), String(candidateId), score);
    res.json(score);
  } catch (error) {
    res.status(400).json({ error: error?.message || "Candidate scoring failed" });
  }
});
router.post("/interview/plan", async (req, res) => {
  try {
    const jobId = String(req.body?.jobId || "");
    const candidateId = String(req.body?.candidateId || "");
    const plan = buildInterviewPlan(String(req.body?.role || "the role"), Array.isArray(req.body?.competencies) ? req.body.competencies : []);
    const interview = jobId && candidateId ? await createInterview(tenantId(req), jobId, candidateId, plan) : null;
    res.json({ plan, interview });
  } catch (error) {
    res.status(400).json({ error: error?.message || "Interview planning failed" });
  }
});
router.get("/jobs/:id/interviews", async (req, res) => {
  try {
    res.json({ interviews: await listInterviews(tenantId(req), String(req.params.id)) });
  } catch (error) {
    res.status(500).json({ error: error?.message || "Unable to list interviews" });
  }
});
router.get("/interviews/:id", async (req, res) => {
  try {
    const interview = await getInterview(tenantId(req), String(req.params.id));
    if (!interview) return res.status(404).json({ error: "Interview not found" });
    res.json(interview);
  } catch (error) {
    res.status(500).json({ error: error?.message || "Unable to load interview" });
  }
});
router.post("/interviews/:id/answers", async (req, res) => {
  try {
    const questionId = String(req.body?.questionId || "");
    const answer = String(req.body?.answer || "");
    if (!questionId || !answer) return res.status(400).json({ error: "questionId and answer are required" });
    const interview = await recordInterviewAnswer(tenantId(req), String(req.params.id), questionId, answer);
    if (!interview) return res.status(404).json({ error: "Interview not found" });
    res.json(interview);
  } catch (error) {
    res.status(400).json({ error: error?.message || "Unable to save interview answer" });
  }
});
router.post("/interviews/:id/complete", async (req, res) => {
  try {
    const interview = await completeInterview(tenantId(req), String(req.params.id), req.body?.evidence || {});
    if (!interview) return res.status(404).json({ error: "Interview not found" });
    res.json(interview);
  } catch (error) {
    res.status(400).json({ error: error?.message || "Unable to complete interview" });
  }
});
router.post("/decision", async (req, res) => {
  try {
    const payload = makeHiringDecision(req.body);
    const saved = await saveHiringState(tenantId(req), String(req.body?.jobId || ""), "decision", payload, req.body?.candidateId);
    res.json({ ...payload, state: saved });
  } catch (error) {
    res.status(400).json({ error: error?.message || "Decision failed" });
  }
});
router.post("/compensation/recommend", async (req, res) => {
  try {
    const payload = recommendCompensation(req.body?.observations || [], req.body?.internalComparable);
    const saved = await saveHiringState(tenantId(req), String(req.body?.jobId || ""), "compensation", payload, req.body?.candidateId);
    res.json({ ...payload, state: saved });
  } catch (error) {
    res.status(400).json({ error: error?.message || "Compensation analysis failed" });
  }
});
router.post("/offer/draft", async (req, res) => {
  try {
    const payload = createOffer(req.body);
    const saved = await saveHiringState(tenantId(req), String(req.body?.jobId || ""), "offer", payload, req.body?.candidateId);
    res.json({ ...payload, state: saved });
  } catch (error) {
    res.status(400).json({ error: error?.message || "Offer drafting failed" });
  }
});
router.post("/offer/transition", async (req, res) => {
  try {
    const jobId = String(req.body?.jobId || "");
    const candidateId = req.body?.candidateId ? String(req.body.candidateId) : void 0;
    if (!jobId) return res.status(400).json({ error: "jobId is required" });
    const states = await listHiringStates(tenantId(req), jobId, "offer");
    const latest = states[0]?.payload;
    if (!latest) return res.status(404).json({ error: "Offer not found" });
    const payload = transitionOffer(latest, req.body?.status);
    const saved = await saveHiringState(tenantId(req), jobId, "offer", payload, candidateId);
    res.json({ ...payload, state: saved });
  } catch (error) {
    res.status(400).json({ error: error?.message || "Offer transition failed" });
  }
});
router.post("/engagement/plan", async (req, res) => {
  try {
    const candidateName = String(req.body?.candidateName || "Candidate");
    const payload = buildEngagementPlan(candidateName);
    const saved = await saveHiringState(tenantId(req), String(req.body?.jobId || ""), "engagement", payload, req.body?.candidateId);
    res.json({ payload, state: saved });
  } catch (error) {
    res.status(400).json({ error: error?.message || "Engagement planning failed" });
  }
});
router.post("/onboarding/plan", async (req, res) => {
  try {
    const payload = buildOnboardingPlan(req.body);
    const saved = await saveHiringState(tenantId(req), String(req.body?.jobId || ""), "onboarding", payload, req.body?.candidateId);
    res.json({ payload, state: saved });
  } catch (error) {
    res.status(400).json({ error: error?.message || "Onboarding planning failed" });
  }
});
router.get("/jobs/:id/hiring-state", async (req, res) => {
  try {
    res.json({ states: await listHiringStates(tenantId(req), String(req.params.id)) });
  } catch (error) {
    res.status(500).json({ error: error?.message || "Unable to load hiring state" });
  }
});
var api_default = router;

// services/recruiting/controlPlane.ts
import { promises as fs5 } from "node:fs";
import path5 from "node:path";
import crypto6 from "node:crypto";
import { Router as Router2 } from "express";
var root = process.env.SMARTSCOUT_CONTROL_PLANE_DIR || path5.join(process.cwd(), ".smartscout-control-plane");
var files = { approvals: "approvals.json", audit: "audit.json", schedules: "schedules.json", usage: "usage.json" };
var queues = {};
async function read(name) {
  try {
    return JSON.parse(await fs5.readFile(path5.join(root, name), "utf8"));
  } catch {
    return [];
  }
}
async function append(name, value) {
  await fs5.mkdir(root, { recursive: true });
  queues[name] = (queues[name] || Promise.resolve()).then(async () => {
    const all = await read(name);
    all.unshift(value);
    await fs5.writeFile(path5.join(root, name), JSON.stringify(all.slice(0, 1e4), null, 2), "utf8");
  });
  await queues[name];
  return value;
}
var now = () => (/* @__PURE__ */ new Date()).toISOString();
async function requestApproval(input) {
  const t = now();
  const value = { ...input, id: `approval_${crypto6.randomUUID()}`, createdAt: t, updatedAt: t, status: "pending" };
  return append(files.approvals, value);
}
async function decideApproval(id, status, actor, note) {
  const all = await read(files.approvals);
  const item = all.find((x) => x.id === id);
  if (!item) return null;
  if (item.status !== "pending") throw new Error("Approval is already decided");
  item.status = status;
  item.decidedBy = actor;
  item.note = note;
  item.updatedAt = now();
  await fs5.writeFile(path5.join(root, files.approvals), JSON.stringify(all, null, 2));
  return item;
}
async function listApprovals(tenantId2, jobId) {
  return (await read(files.approvals)).filter((x) => x.tenantId === tenantId2 && (!jobId || x.jobId === jobId));
}
async function audit(input) {
  const t = now();
  const value = { ...input, id: `audit_${crypto6.randomUUID()}`, createdAt: t, updatedAt: t };
  return append(files.audit, value);
}
async function listAudit(tenantId2, jobId) {
  return (await read(files.audit)).filter((x) => x.tenantId === tenantId2 && (!jobId || x.jobId === jobId));
}
async function scheduleInterview(input) {
  if (new Date(input.endsAt) <= new Date(input.startsAt)) throw new Error("Interview end must be after start");
  const existing = await read(files.schedules);
  const clash = existing.find((x) => x.tenantId === input.tenantId && x.status !== "cancelled" && new Date(input.startsAt) < new Date(x.endsAt) && new Date(input.endsAt) > new Date(x.startsAt));
  if (clash) throw new Error("Interview time overlaps an existing booking");
  const t = now();
  const value = { ...input, id: `schedule_${crypto6.randomUUID()}`, createdAt: t, updatedAt: t };
  return append(files.schedules, value);
}
async function updateSchedule(id, status) {
  const all = await read(files.schedules);
  const item = all.find((x) => x.id === id);
  if (!item) return null;
  item.status = status;
  item.updatedAt = now();
  await fs5.writeFile(path5.join(root, files.schedules), JSON.stringify(all, null, 2));
  return item;
}
async function listSchedules(tenantId2, jobId) {
  return (await read(files.schedules)).filter((x) => x.tenantId === tenantId2 && (!jobId || x.jobId === jobId));
}
async function recordUsage(input) {
  const t = now();
  const value = { ...input, id: `usage_${crypto6.randomUUID()}`, createdAt: t, updatedAt: t };
  return append(files.usage, value);
}
async function usageSummary(tenantId2, period) {
  const rows = await read(files.usage);
  const filtered = rows.filter((x) => x.tenantId === tenantId2 && (!period || x.period === period));
  return filtered.reduce((a, x) => (a[x.feature] = (a[x.feature] || 0) + x.units, a), {});
}
function createControlPlaneRouter(tenantId2) {
  const r = Router2();
  r.post("/approvals", async (req, res) => {
    try {
      res.json(await requestApproval({ ...req.body, tenantId: tenantId2(req) }));
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });
  r.get("/approvals", async (req, res) => res.json({ approvals: await listApprovals(tenantId2(req), req.query.jobId ? String(req.query.jobId) : void 0) }));
  r.post("/approvals/:id/decision", async (req, res) => {
    try {
      const out = await decideApproval(String(req.params.id), req.body?.status, String(req.body?.actor || "system"), req.body?.note);
      if (!out) return res.status(404).json({ error: "Approval not found" });
      res.json(out);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });
  r.get("/audit", async (req, res) => res.json({ events: await listAudit(tenantId2(req), req.query.jobId ? String(req.query.jobId) : void 0) }));
  r.post("/audit", async (req, res) => res.json(await audit({ ...req.body, tenantId: tenantId2(req) })));
  r.post("/schedules", async (req, res) => {
    try {
      res.json(await scheduleInterview({ ...req.body, tenantId: tenantId2(req) }));
    } catch (e) {
      res.status(409).json({ error: e.message });
    }
  });
  r.get("/schedules", async (req, res) => res.json({ schedules: await listSchedules(tenantId2(req), req.query.jobId ? String(req.query.jobId) : void 0) }));
  r.post("/schedules/:id/status", async (req, res) => {
    const out = await updateSchedule(String(req.params.id), req.body?.status);
    if (!out) return res.status(404).json({ error: "Schedule not found" });
    res.json(out);
  });
  r.post("/usage", async (req, res) => res.json(await recordUsage({ ...req.body, tenantId: tenantId2(req) })));
  r.get("/usage", async (req, res) => res.json({ usage: await usageSummary(tenantId2(req), req.query.period ? String(req.query.period) : void 0) }));
  return r;
}

// services/recruiting/firebaseAuth.ts
import { createHmac, randomBytes as randomBytes2, timingSafeEqual } from "node:crypto";
var FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "gen-lang-client-0431516636";
var FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || "AIzaSyCK2ESnkH49-h9lUenEsvQvQwJSeRr3aVw";
var SESSION_SECRET = process.env.SMARTSCOUT_SESSION_SECRET || process.env.SMARTSCOUT_VAULT_KEY || FIREBASE_API_KEY;
var SESSION_COOKIE = "smartscout_workspace";
var SESSION_MAX_AGE = 60 * 60 * 24 * 30;
function signSession(id) {
  return createHmac("sha256", SESSION_SECRET).update(id).digest("base64url");
}
function validSession(value) {
  const [id, signature] = value.split(".");
  if (!id || !signature) return null;
  const expected = signSession(id);
  try {
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  return id;
}
function getCookie(req, name) {
  const raw = String(req.headers.cookie || "");
  const prefix = `${name}=`;
  const part = raw.split(";").map((value) => value.trim()).find((value) => value.startsWith(prefix));
  return part ? decodeURIComponent(part.slice(prefix.length)) : "";
}
function ensureGuestWorkspace(req, res) {
  const existing = validSession(getCookie(req, SESSION_COOKIE));
  const id = existing || randomBytes2(32).toString("hex");
  if (!existing) {
    res.setHeader("Set-Cookie", `${SESSION_COOKIE}=${encodeURIComponent(`${id}.${signSession(id)}`)}; Path=/; Max-Age=${SESSION_MAX_AGE}; HttpOnly; Secure; SameSite=Lax`);
  }
  return { kind: "guest", id: `guest:${id}` };
}
async function verifyFirebaseIdToken(token) {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(FIREBASE_API_KEY)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idToken: token }) });
  const data = await response.json();
  const user = data?.users?.[0];
  if (!response.ok || !user?.localId) throw new Error("Invalid Firebase authentication token");
  if (user.disabled) throw new Error("Firebase account is disabled");
  return { uid: String(user.localId), email: user.email, emailVerified: Boolean(user.emailVerified), displayName: user.displayName };
}
async function resolveWorkspaceIdentity(req, res) {
  const header = String(req.header("authorization") || "");
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (token) {
    const identity = await verifyFirebaseIdToken(token);
    return { kind: "firebase", id: identity.uid, email: identity.email, emailVerified: identity.emailVerified, displayName: identity.displayName };
  }
  return ensureGuestWorkspace(req, res);
}
async function requireWorkspaceAuth(req, res, next) {
  try {
    const identity = await resolveWorkspaceIdentity(req, res);
    req.workspaceIdentity = identity;
    req.headers["x-tenant-id"] = identity.id;
    next();
  } catch (error) {
    res.status(401).json({ error: error?.message || "Workspace authentication failed" });
  }
}
function authenticatedTenantId(req) {
  const identity = req.workspaceIdentity;
  if (identity?.id) return identity.id;
  const uid = req.firebaseUser?.uid;
  if (uid) return String(uid);
  throw new Error("Workspace identity is missing");
}
function workspaceSessionInfo(req, res) {
  const identity = ensureGuestWorkspace(req, res);
  res.json({ ok: true, workspaceId: identity.id, kind: identity.kind });
}

// server.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path6.dirname(__filename);
async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3e3;
  app.use(express.json({ limit: "50mb" }));
  app.get("/api/recruiting/health", (_req, res) => {
    res.json({ ok: true, service: "smartscout-recruiting" });
  });
  app.get("/api/recruiting/session", workspaceSessionInfo);
  const tenantId2 = (req) => authenticatedTenantId(req);
  app.use("/api/recruiting", requireWorkspaceAuth, api_default);
  app.use("/api/control-plane", requireWorkspaceAuth, createControlPlaneRouter(tenantId2));
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
  app.post("/api/create-checkout-session", async (req, res) => {
    if (!stripe) return res.status(500).json({ error: "Stripe is not configured" });
    const { priceId, userId, credits, packageName } = req.body;
    try {
      const session = await stripe.checkout.sessions.create({ payment_method_types: ["card"], line_items: [{ price: priceId, quantity: 1 }], mode: "payment", success_url: `${req.headers.origin}/?payment=success&credits=${credits}&package=${encodeURIComponent(packageName)}`, cancel_url: `${req.headers.origin}/?payment=cancel`, metadata: { userId, credits: credits.toString(), packageName } });
      res.json({ id: session.id });
    } catch (err) {
      console.error("Stripe Session Error:", err);
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/send-report", async (req, res) => {
    const { recruiterEmail, candidateName, overallScore, status, reason, parameters = [], responses = [] } = req.body;
    if (!resend) return res.status(400).json({ success: false, error: "RESEND_API_KEY is not configured." });
    try {
      const doc = new jsPDF();
      doc.setFontSize(22);
      doc.text("Interview Report", 20, 20);
      doc.setFontSize(14);
      doc.text(`Candidate: ${candidateName}`, 20, 35);
      doc.text(`Overall Score: ${overallScore}%`, 20, 45);
      doc.text(`Status: ${status}`, 20, 55);
      doc.setFontSize(16);
      doc.text("Executive Summary", 20, 70);
      doc.setFontSize(12);
      const splitReason = doc.splitTextToSize(String(reason || ""), 170);
      doc.text(splitReason, 20, 80);
      let y = 80 + splitReason.length * 7;
      doc.setFontSize(16);
      doc.text("Score Breakdown", 20, y + 10);
      doc.setFontSize(12);
      y += 20;
      parameters.forEach((p) => {
        doc.text(`${p.name}: ${p.score}%`, 20, y);
        y += 10;
      });
      doc.setFontSize(16);
      doc.text("Q&A Transcript", 20, y + 10);
      doc.setFontSize(12);
      y += 20;
      responses.forEach((r, index) => {
        const q = doc.splitTextToSize(`Q${index + 1}: ${r.question}`, 170);
        doc.text(q, 20, y);
        y += q.length * 7;
        const a = doc.splitTextToSize(`A: ${r.answer}`, 170);
        doc.text(a, 20, y);
        y += a.length * 7 + 5;
      });
      const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
      const { data, error } = await resend.emails.send({ from: "SmartScout <reports@smartscout.online>", to: [recruiterEmail], subject: `Interview Report: ${candidateName} (${status} - ${overallScore}%)`, attachments: [{ filename: `${candidateName.replace(/\s+/g, "_")}_Report.pdf`, content: pdfBuffer }], html: `<h1>Interview Report</h1><p><strong>Candidate:</strong> ${candidateName}</p><p><strong>Overall Score:</strong> ${overallScore}%</p><p><strong>Status:</strong> ${status}</p><p>${String(reason || "")}</p>` });
      if (error) return res.status(500).json({ success: false, error: error.message });
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/send-invitation", async (req, res) => {
    const { candidateEmail, candidateName, designation, company, jd, emailBody, scheduledAt, interviewLink } = req.body;
    if (!resend) return res.status(400).json({ success: false, error: "RESEND_API_KEY is not configured." });
    try {
      const attachments = [];
      if (jd) attachments.push({ filename: "job-description.txt", content: Buffer.from(jd) });
      if (scheduledAt) {
        const date = new Date(scheduledAt);
        const event = { start: [date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes()], duration: { hours: 1 }, title: `AI Interview with ${company || "SmartScout"}: ${candidateName} - ${designation || "Position"}`, description: `Your AI-powered audio interview is scheduled.

Interview Link: ${interviewLink}

${emailBody}`, location: "SmartScout AI Platform", url: interviewLink, status: "CONFIRMED", busyStatus: "BUSY", organizer: { name: "SmartScout Recruitment", email: "interviews@smartscout.online" }, attendees: [{ name: candidateName, email: candidateEmail, rsvp: true, partstat: "ACCEPTED", role: "REQ-PARTICIPANT" }] };
        const { error: error2, value } = ics.createEvent(event);
        if (!error2 && value) attachments.push({ filename: "interview-invite.ics", content: Buffer.from(value) });
      }
      const { data, error } = await resend.emails.send({ from: "SmartScout <interviews@smartscout.online>", to: [candidateEmail], subject: `Interview Invitation: ${company || "SmartScout"} - ${designation || "Position"}`, attachments, html: `<h1>Interview Invitation</h1><div style="white-space:pre-wrap">${emailBody}</div>${scheduledAt ? `<p>Scheduled: ${new Date(scheduledAt).toLocaleString()}</p>` : ""}` });
      if (error) return res.status(500).json({ success: false, error: error.message });
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path6.join(process.cwd(), "dist");
    app.use(express.static(distPath, { setHeaders: (res, filePath5) => {
      if (filePath5.endsWith(".html")) {
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
      }
    } }));
    app.get("*all", (req, res) => {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.sendFile(path6.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
}
startServer();
