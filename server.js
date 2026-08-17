// server.ts
import express from "express";
import path7 from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";
import { Resend } from "resend";
import * as ics from "ics";
import Stripe from "stripe";
import { jsPDF } from "jspdf";

// services/recruiting/api.ts
import { Router as Router2 } from "express";

// services/recruiting/aiGateway.ts
var DEFAULT_MODELS = { gemini: "gemini-3.6-flash", openai: "gpt-4.1-mini", anthropic: "claude-3-5-haiku-latest" };
function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}
function cleanKey(value) {
  return String(value || "").trim().replace(/^(["'`])|(["'`])$/g, "");
}
function normalizeGeminiModel(model) {
  const value = String(model || "").trim();
  if (!value) return DEFAULT_MODELS.gemini;
  const aliases = { "gemini-2.5-flash": "gemini-3.6-flash", "gemini-2.5-flash-preview-09-2025": "gemini-3.6-flash", "gemini-3-flash-preview": "gemini-3.6-flash", "gemini-flash-latest": "gemini-3.6-flash" };
  return aliases[value] || value;
}
async function callGemini(request) {
  const model = normalizeGeminiModel(request.model);
  const isGemini3 = /^gemini-3(?:\.|-)/.test(model);
  const generationConfig = { maxOutputTokens: request.maxTokens ?? 2e3 };
  if (!isGemini3) generationConfig.temperature = request.temperature ?? 0.2;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": cleanKey(request.apiKey) }, body: JSON.stringify({ systemInstruction: request.system ? { parts: [{ text: request.system }] } : void 0, contents: [{ role: "user", parts: [{ text: request.prompt }] }], generationConfig }) });
  const data = await response.json();
  if (!response.ok) {
    const reason = String(data?.error?.status || data?.error?.details?.find((d) => d?.reason)?.reason || "");
    const message = String(data?.error?.message || `Gemini request failed (${response.status})`);
    if (reason === "API_KEY_INVALID" || /API key not valid/i.test(message)) throw new Error("Google rejected this Gemini API key. Use an active Gemini API key from Google AI Studio.");
    if (response.status === 403) throw new Error(`Gemini access was denied: ${message}`);
    throw new Error(message);
  }
  const candidates = Array.isArray(data?.candidates) ? data.candidates : [];
  const text = cleanText(candidates.flatMap((candidate) => Array.isArray(candidate?.content?.parts) ? candidate.content.parts : []).map((part) => part?.text).filter(Boolean).join(""));
  if (!text) {
    const finish = String(candidates[0]?.finishReason || "");
    const block = String(data?.promptFeedback?.blockReason || "");
    if (block) throw new Error(`Gemini blocked the connectivity test (${block}).`);
    if (finish === "MAX_TOKENS") throw new Error("Gemini used the available thinking/output budget before returning text.");
    throw new Error(`Gemini returned no text (finishReason: ${finish || "unknown"}).`);
  }
  return { provider: "gemini", model, text, usage: { inputTokens: data?.usageMetadata?.promptTokenCount, outputTokens: data?.usageMetadata?.candidatesTokenCount } };
}
async function callOpenAI(request) {
  const model = request.model || DEFAULT_MODELS.openai;
  const response = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${cleanKey(request.apiKey)}` }, body: JSON.stringify({ model, messages: [...request.system ? [{ role: "system", content: request.system }] : [], { role: "user", content: request.prompt }], temperature: request.temperature ?? 0.2, max_tokens: request.maxTokens ?? 2e3 }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || `OpenAI request failed (${response.status})`);
  const text = cleanText(data?.choices?.[0]?.message?.content);
  if (!text) throw new Error("OpenAI returned an empty response");
  return { provider: "openai", model, text, usage: { inputTokens: data?.usage?.prompt_tokens, outputTokens: data?.usage?.completion_tokens } };
}
async function callAnthropic(request) {
  const model = request.model || DEFAULT_MODELS.anthropic;
  const response = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": cleanKey(request.apiKey), "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model, max_tokens: request.maxTokens ?? 2e3, temperature: request.temperature ?? 0.2, system: request.system, messages: [{ role: "user", content: request.prompt }] }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || `Anthropic request failed (${response.status})`);
  const text = cleanText(data?.content?.filter((item) => item?.type === "text").map((item) => item.text).join(""));
  if (!text) throw new Error("Anthropic returned an empty response");
  return { provider: "anthropic", model, text, usage: { inputTokens: data?.usage?.input_tokens, outputTokens: data?.usage?.output_tokens } };
}
async function generateAI(request) {
  const apiKey = cleanKey(request.apiKey);
  if (!apiKey) throw new Error("AI provider credential is not configured");
  if (!request.prompt?.trim()) throw new Error("AI prompt is required");
  switch (request.provider) {
    case "gemini":
      return callGemini({ ...request, apiKey, model: normalizeGeminiModel(request.model) });
    case "openai":
      return callOpenAI({ ...request, apiKey });
    case "anthropic":
      return callAnthropic({ ...request, apiKey });
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
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
      generationConfig: { maxOutputTokens: 5e3 }
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || `Candidate search failed (${response.status})`);
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p?.text).filter(Boolean).join("") || "";
  let parsed;
  try {
    parsed = JSON.parse(cleanJson(text));
  } catch {
    throw new Error("Candidate search returned invalid structured data. Please retry the search.");
  }
  const seen = /* @__PURE__ */ new Set();
  return (Array.isArray(parsed?.candidates) ? parsed.candidates : []).map((c) => ({
    ...c,
    profileUrl: String(c?.profileUrl || "").trim(),
    source: String(c?.source || "").trim() || hostname(String(c?.profileUrl || "")),
    evidence: Array.isArray(c?.evidence) ? c.evidence.map((x) => String(x).trim()).filter(Boolean) : []
  })).filter((c) => {
    const key = c.profileUrl.toLowerCase();
    if (!c.name || !key || !c.source || !c.evidence.length || seen.has(key)) return false;
    let url;
    try {
      url = new URL(c.profileUrl);
    } catch {
      return false;
    }
    if (!["http:", "https:"].includes(url.protocol)) return false;
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

// services/recruiting/controlPlane.ts
import { promises as fs5 } from "node:fs";
import path5 from "node:path";
import crypto6 from "node:crypto";
import { Router } from "express";
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
async function audit(input) {
  const t = now();
  return append(files.audit, { ...input, id: `audit_${crypto6.randomUUID()}`, createdAt: t, updatedAt: t });
}
async function requestApproval(input) {
  const t = now();
  const value = { ...input, id: `approval_${crypto6.randomUUID()}`, createdAt: t, updatedAt: t, status: "pending" };
  await append(files.approvals, value);
  await audit({ tenantId: input.tenantId, jobId: input.jobId, candidateId: input.candidateId, action: "approval_requested", actor: input.requestedBy, metadata: { approvalId: value.id, approvalAction: value.action } });
  return value;
}
async function decideApproval(id, status, actor, note, tenantId2) {
  if (!["approved", "rejected"].includes(status)) throw new Error("Invalid approval status");
  if (!tenantId2) throw new Error("Tenant identity is required");
  const all = await read(files.approvals);
  const item = all.find((x) => x.id === id && x.tenantId === tenantId2);
  if (!item) return null;
  if (item.status !== "pending") throw new Error("Approval is already decided");
  item.status = status;
  item.decidedBy = actor;
  item.note = note;
  item.updatedAt = now();
  await fs5.writeFile(path5.join(root, files.approvals), JSON.stringify(all, null, 2));
  await audit({ tenantId: item.tenantId, jobId: item.jobId, candidateId: item.candidateId, action: `approval_${status}`, actor, metadata: { approvalId: id, approvalAction: item.action, note: note || "" } });
  return item;
}
async function listApprovals(tenantId2, jobId) {
  return (await read(files.approvals)).filter((x) => x.tenantId === tenantId2 && (!jobId || x.jobId === jobId));
}
async function listAudit(tenantId2, jobId) {
  return (await read(files.audit)).filter((x) => x.tenantId === tenantId2 && (!jobId || x.jobId === jobId));
}
async function scheduleInterview(input) {
  if (new Date(input.endsAt) <= new Date(input.startsAt)) throw new Error("Interview end must be after start");
  const existing = await read(files.schedules);
  if (existing.find((x) => x.tenantId === input.tenantId && x.status !== "cancelled" && new Date(input.startsAt) < new Date(x.endsAt) && new Date(input.endsAt) > new Date(x.startsAt))) throw new Error("Interview time overlaps an existing booking");
  const t = now();
  return append(files.schedules, { ...input, id: `schedule_${crypto6.randomUUID()}`, createdAt: t, updatedAt: t });
}
async function updateSchedule(id, status, tenantId2) {
  if (!["proposed", "confirmed", "cancelled"].includes(status)) throw new Error("Invalid schedule status");
  const all = await read(files.schedules);
  const item = all.find((x) => x.id === id && x.tenantId === tenantId2);
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
  return append(files.usage, { ...input, id: `usage_${crypto6.randomUUID()}`, createdAt: t, updatedAt: t });
}
async function usageSummary(tenantId2, period) {
  return (await read(files.usage)).filter((x) => x.tenantId === tenantId2 && (!period || x.period === period)).reduce((a, x) => (a[x.feature] = (a[x.feature] || 0) + x.units, a), {});
}
function createControlPlaneRouter(tenantId2) {
  const r = Router();
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
      const tenant = tenantId2(req);
      const actor = String(req.workspaceIdentity?.email || tenant);
      const out = await decideApproval(String(req.params.id), req.body?.status, actor, req.body?.note, tenant);
      if (!out) return res.status(404).json({ error: "Approval not found" });
      res.json(out);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });
  r.get("/audit", async (req, res) => res.json({ events: await listAudit(tenantId2(req), req.query.jobId ? String(req.query.jobId) : void 0) }));
  r.post("/audit", async (req, res) => res.json(await audit({ ...req.body, tenantId: tenantId2(req), actor: String(req.workspaceIdentity?.email || tenantId2(req)) })));
  r.post("/schedules", async (req, res) => {
    try {
      res.json(await scheduleInterview({ ...req.body, tenantId: tenantId2(req) }));
    } catch (e) {
      res.status(409).json({ error: e.message });
    }
  });
  r.get("/schedules", async (req, res) => res.json({ schedules: await listSchedules(tenantId2(req), req.query.jobId ? String(req.query.jobId) : void 0) }));
  r.post("/schedules/:id/status", async (req, res) => {
    try {
      const out = await updateSchedule(String(req.params.id), req.body?.status, tenantId2(req));
      if (!out) return res.status(404).json({ error: "Schedule not found" });
      res.json(out);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });
  r.post("/usage", async (req, res) => res.json(await recordUsage({ ...req.body, tenantId: tenantId2(req) })));
  r.get("/usage", async (req, res) => res.json({ usage: await usageSummary(tenantId2(req), req.query.period ? String(req.query.period) : void 0) }));
  return r;
}

// services/recruiting/productionIntegrations.ts
var normalize = (value) => value.toLowerCase().replace(/[^a-z0-9+#.]+/g, " ").trim();
function deriveKnockoutCriteria(requirement) {
  return [
    ...requirement.mustHave.map((skill, index) => ({ id: `skill-${index + 1}`, label: skill, type: "required_skill", value: skill, hard: true })),
    ...requirement.experienceMin != null ? [{ id: "experience-min", label: "Minimum experience", type: "min_experience", value: requirement.experienceMin, hard: true }] : [],
    ...requirement.location ? [{ id: "location", label: "Location", type: "location", value: requirement.location, hard: false }] : []
  ];
}
function runKnockout(candidate, criteria) {
  const text = normalize([candidate.resumeText || "", candidate.name, candidate.profileUrl || ""].join(" "));
  const checks = criteria.map((criterion) => {
    if (criterion.type === "required_skill") {
      const target = normalize(String(criterion.value));
      const passed = text.includes(target) || (candidate.score?.evidence || []).some((e) => normalize(e.value).includes(target));
      return { id: criterion.id, label: criterion.label, passed, evidence: passed ? `Evidence matched: ${criterion.value}` : void 0 };
    }
    if (criterion.type === "min_experience") {
      const years = candidate.experienceYears ?? Number(candidate.score?.experience || 0) / 10;
      const passed = years >= Number(criterion.value);
      return { id: criterion.id, label: criterion.label, passed, evidence: `Estimated experience: ${years.toFixed(1)} years` };
    }
    if (criterion.type === "location") {
      const location = normalize(candidate.location || "");
      const target = normalize(String(criterion.value));
      const passed = !location || location.includes(target) || target.includes(location);
      return { id: criterion.id, label: criterion.label, passed, evidence: candidate.location ? `Candidate location: ${candidate.location}` : "Location not provided" };
    }
    if (criterion.type === "work_authorization") {
      const passed = normalize(candidate.workAuthorization || "") === normalize(String(criterion.value));
      return { id: criterion.id, label: criterion.label, passed, evidence: candidate.workAuthorization || "Not provided" };
    }
    return { id: criterion.id, label: criterion.label, passed: true, evidence: "Custom criterion requires recruiter review" };
  });
  const hardFailures = checks.filter((check, index) => !check.passed && criteria[index]?.hard).map((check) => check.label);
  const warnings = checks.filter((check, index) => !check.passed && !criteria[index]?.hard).map((check) => check.label);
  return { candidateId: candidate.id, passed: hardFailures.length === 0, hardFailures, warnings, checks };
}
function compareCandidates(candidates, requirement) {
  const criteria = deriveKnockoutCriteria(requirement);
  return candidates.map((candidate) => {
    const knockout = runKnockout(candidate, criteria);
    const score = candidate.score?.overall ?? 0;
    const penalty = knockout.hardFailures.length ? 100 : knockout.warnings.length * 5;
    return { candidateId: candidate.id, rank: 0, overall: Math.max(0, score - penalty), strengths: candidate.score?.strengths || [], concerns: [...candidate.score?.concerns || [], ...knockout.hardFailures], knockout };
  }).sort((a, b) => b.overall - a.overall).map((candidate, index) => ({ ...candidate, rank: index + 1 }));
}
function integrationHealth(env = process.env) {
  return [
    { id: "resend", provider: "Resend", configured: Boolean(env.RESEND_API_KEY), capabilities: ["offer-email", "interview-email", "report-email"], missing: env.RESEND_API_KEY ? [] : ["RESEND_API_KEY"] },
    { id: "supabase", provider: "Supabase", configured: Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY), capabilities: ["persistent-state", "audit", "documents"], missing: [env.SUPABASE_URL ? "" : "SUPABASE_URL", env.SUPABASE_SERVICE_ROLE_KEY ? "" : "SUPABASE_SERVICE_ROLE_KEY"].filter(Boolean) },
    { id: "linkedin", provider: "LinkedIn licensed API", configured: Boolean(env.LINKEDIN_CLIENT_ID && env.LINKEDIN_CLIENT_SECRET), capabilities: ["licensed-source"], missing: [env.LINKEDIN_CLIENT_ID ? "" : "LINKEDIN_CLIENT_ID", env.LINKEDIN_CLIENT_SECRET ? "" : "LINKEDIN_CLIENT_SECRET"].filter(Boolean) },
    { id: "naukri", provider: "Naukri licensed API", configured: Boolean(env.NAUKRI_CLIENT_ID && env.NAUKRI_CLIENT_SECRET), capabilities: ["licensed-source"], missing: [env.NAUKRI_CLIENT_ID ? "" : "NAUKRI_CLIENT_ID", env.NAUKRI_CLIENT_SECRET ? "" : "NAUKRI_CLIENT_SECRET"].filter(Boolean) },
    { id: "calendar", provider: env.CALENDAR_PROVIDER || "Calendar provider", configured: Boolean(env.CALENDAR_API_URL && env.CALENDAR_API_TOKEN), capabilities: ["scheduling", "secure-links"], missing: [env.CALENDAR_API_URL ? "" : "CALENDAR_API_URL", env.CALENDAR_API_TOKEN ? "" : "CALENDAR_API_TOKEN"].filter(Boolean) },
    { id: "transcription", provider: env.TRANSCRIPTION_PROVIDER || "Transcription provider", configured: Boolean(env.TRANSCRIPTION_API_URL && env.TRANSCRIPTION_API_KEY), capabilities: ["transcription"], missing: [env.TRANSCRIPTION_API_URL ? "" : "TRANSCRIPTION_API_URL", env.TRANSCRIPTION_API_KEY ? "" : "TRANSCRIPTION_API_KEY"].filter(Boolean) },
    { id: "compensation", provider: env.COMPENSATION_PROVIDER || "Compensation data provider", configured: Boolean(env.COMPENSATION_API_URL && env.COMPENSATION_API_KEY), capabilities: ["market-data"], missing: [env.COMPENSATION_API_URL ? "" : "COMPENSATION_API_URL", env.COMPENSATION_API_KEY ? "" : "COMPENSATION_API_KEY"].filter(Boolean) },
    { id: "hris", provider: env.HRIS_PROVIDER || "HRIS provider", configured: Boolean(env.HRIS_API_URL && env.HRIS_API_TOKEN), capabilities: ["employee-create", "documents", "tasks"], missing: [env.HRIS_API_URL ? "" : "HRIS_API_URL", env.HRIS_API_TOKEN ? "" : "HRIS_API_TOKEN"].filter(Boolean) }
  ];
}
async function postJson(url, token, body, timeoutMs = 15e3) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(body), signal: controller.signal });
    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }
    if (!response.ok) throw new Error(data?.error?.message || data?.error || `Integration request failed (${response.status})`);
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

// services/recruiting/api.ts
var router = Router2();
var sessions = /* @__PURE__ */ new Map();
function tenantId(req) {
  return String(req.header("x-tenant-id") || "");
}
async function getCredential(req) {
  const tenant = tenantId(req);
  if (!tenant) throw new Error("Workspace identity is missing");
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
async function latestApproval(tenant, jobId, action) {
  const rows = await listApprovals(tenant, jobId);
  return rows.find((x) => x.action === action) || null;
}
async function requireApproval(req, jobId, action) {
  const approval = await latestApproval(tenantId(req), jobId, action);
  if (!approval || approval.status !== "approved") throw new Error(`Human approval required before ${action.replace("_", " ")}.`);
  return approval;
}
async function createGate(req, jobId, action, note) {
  const tenant = tenantId(req);
  const existing = await latestApproval(tenant, jobId, action);
  if (existing?.status === "pending" || existing?.status === "approved") return existing;
  return requestApproval({ tenantId: tenant, jobId, action, requestedBy: "recruiter", note });
}
router.get("/health", (_req, res) => res.json({ ok: true, service: "recruiting-os" }));
router.get("/integrations/health", (_req, res) => res.json({ integrations: integrationHealth() }));
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
    await Promise.all(["gemini", "openai", "anthropic"].map((p) => deleteAICredential(tenant, p)));
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
    const jobId = String(req.body?.jobId || req.body?.role?.jobId || "");
    if (!jobId) return res.status(400).json({ error: "jobId is required before sourcing" });
    await requireApproval(req, jobId, "jd_approval");
    const c = await getCredential(req);
    const role = req.body?.role || {};
    const candidates = await searchWebCandidates(c.apiKey, role, Number(req.body?.limit) || 8);
    const saved = await saveCandidates(tenantId(req), jobId, candidates);
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
    if (jobId) await requireApproval(req, String(jobId), "jd_approval");
    const c = await getCredential(req);
    const score = await scoreCandidate(candidate, requirement, c.provider, c.apiKey, c.model);
    if (jobId && candidateId) await updateCandidateScore(tenantId(req), String(candidateId), score);
    res.json(score);
  } catch (error) {
    res.status(400).json({ error: error?.message || "Candidate scoring failed" });
  }
});
router.post("/candidate/knockout", async (req, res) => {
  try {
    const candidate = req.body?.candidate;
    const requirement = req.body?.requirement;
    if (!candidate || !requirement) return res.status(400).json({ error: "candidate and requirement are required" });
    const criteria = Array.isArray(req.body?.criteria) ? req.body.criteria : deriveKnockoutCriteria(requirement);
    res.json(runKnockout(candidate, criteria));
  } catch (error) {
    res.status(400).json({ error: error?.message || "Knockout evaluation failed" });
  }
});
router.post("/candidates/compare", async (req, res) => {
  try {
    const candidates = Array.isArray(req.body?.candidates) ? req.body.candidates : [];
    const requirement = req.body?.requirement;
    if (!candidates.length || !requirement) return res.status(400).json({ error: "candidates and requirement are required" });
    res.json({ comparisons: compareCandidates(candidates, requirement) });
  } catch (error) {
    res.status(400).json({ error: error?.message || "Candidate comparison failed" });
  }
});
router.post("/interview/plan", async (req, res) => {
  try {
    const jobId = String(req.body?.jobId || "");
    const candidateId = String(req.body?.candidateId || "");
    if (jobId) await requireApproval(req, jobId, "jd_approval");
    if (!candidateId) return res.status(400).json({ error: "candidateId is required" });
    const plan = buildInterviewPlan(String(req.body?.role || "the role"), Array.isArray(req.body?.competencies) ? req.body.competencies : []);
    const interview = jobId ? await createInterview(tenantId(req), jobId, candidateId, plan) : null;
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
    const jobId = String(req.body?.jobId || "");
    const candidateId = String(req.body?.candidateId || "");
    if (!jobId || !candidateId) return res.status(400).json({ error: "jobId and candidateId are required" });
    await requireApproval(req, jobId, "jd_approval");
    const interviews = await listInterviews(tenantId(req), jobId);
    const completed = interviews.find((x) => x.candidateId === candidateId && x.status === "completed");
    if (!completed) return res.status(409).json({ error: "Complete the candidate interview before creating a hiring decision." });
    const payload = makeHiringDecision(req.body);
    const saved = await saveHiringState(tenantId(req), jobId, "decision", payload, candidateId);
    const approval = await createGate(req, jobId, "decision", "Review the candidate evidence and approve the hiring recommendation before compensation.");
    res.json({ ...payload, state: saved, approval });
  } catch (error) {
    res.status(400).json({ error: error?.message || "Decision failed" });
  }
});
router.post("/compensation/recommend", async (req, res) => {
  try {
    const jobId = String(req.body?.jobId || "");
    if (!jobId) return res.status(400).json({ error: "jobId is required" });
    await requireApproval(req, jobId, "decision");
    const payload = recommendCompensation(req.body?.observations || [], req.body?.internalComparable);
    const saved = await saveHiringState(tenantId(req), jobId, "compensation", payload, req.body?.candidateId);
    const approval = await createGate(req, jobId, "compensation", "Review the compensation recommendation before drafting an offer.");
    res.json({ ...payload, state: saved, approval });
  } catch (error) {
    res.status(400).json({ error: error?.message || "Compensation analysis failed" });
  }
});
router.post("/offer/draft", async (req, res) => {
  try {
    const jobId = String(req.body?.jobId || "");
    if (!jobId) return res.status(400).json({ error: "jobId is required" });
    await requireApproval(req, jobId, "compensation");
    const payload = createOffer(req.body);
    const saved = await saveHiringState(tenantId(req), jobId, "offer", payload, req.body?.candidateId);
    const approval = await createGate(req, jobId, "offer", "Review the offer package before it can be sent to the candidate.");
    res.json({ ...payload, state: saved, approval });
  } catch (error) {
    res.status(400).json({ error: error?.message || "Offer drafting failed" });
  }
});
router.post("/offer/transition", async (req, res) => {
  try {
    const jobId = String(req.body?.jobId || "");
    const candidateId = req.body?.candidateId ? String(req.body.candidateId) : void 0;
    const next = String(req.body?.status || "");
    if (!jobId) return res.status(400).json({ error: "jobId is required" });
    const states = await listHiringStates(tenantId(req), jobId, "offer");
    const latest = states[0]?.payload;
    if (!latest) return res.status(404).json({ error: "Offer not found" });
    if (next === "approved" || next === "sent") await requireApproval(req, jobId, "offer");
    if (next === "sent" && latest.status !== "approved") return res.status(409).json({ error: "Approve the offer before sending it." });
    const payload = transitionOffer(latest, next);
    const saved = await saveHiringState(tenantId(req), jobId, "offer", payload, candidateId);
    res.json({ ...payload, state: saved, approval: await latestApproval(tenantId(req), jobId, "offer") });
  } catch (error) {
    res.status(400).json({ error: error?.message || "Offer transition failed" });
  }
});
router.post("/engagement/plan", async (req, res) => {
  try {
    const jobId = String(req.body?.jobId || "");
    if (!jobId) return res.status(400).json({ error: "jobId is required" });
    const offers = await listHiringStates(tenantId(req), jobId, "offer");
    const accepted = offers.find((x) => x.payload?.status === "accepted");
    if (!accepted) return res.status(409).json({ error: "Candidate must accept the offer before engagement planning." });
    const payload = buildEngagementPlan(String(req.body?.candidateName || "Candidate"));
    const saved = await saveHiringState(tenantId(req), jobId, "engagement", payload, req.body?.candidateId);
    res.json({ payload, state: saved });
  } catch (error) {
    res.status(400).json({ error: error?.message || "Engagement planning failed" });
  }
});
router.post("/onboarding/plan", async (req, res) => {
  try {
    const jobId = String(req.body?.jobId || "");
    if (!jobId) return res.status(400).json({ error: "jobId is required" });
    const offers = await listHiringStates(tenantId(req), jobId, "offer");
    if (!offers.some((x) => x.payload?.status === "accepted")) return res.status(409).json({ error: "Candidate must accept the offer before onboarding." });
    const payload = buildOnboardingPlan(req.body);
    const saved = await saveHiringState(tenantId(req), jobId, "onboarding", payload, req.body?.candidateId);
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
router.post("/integrations/calendar/schedule", async (req, res) => {
  try {
    if (!process.env.CALENDAR_API_URL || !process.env.CALENDAR_API_TOKEN) return res.status(503).json({ error: "Calendar integration is not configured" });
    const payload = await postJson(process.env.CALENDAR_API_URL, process.env.CALENDAR_API_TOKEN, req.body);
    res.json({ ok: true, payload });
  } catch (error) {
    res.status(502).json({ error: error?.message || "Calendar provider request failed" });
  }
});
router.post("/integrations/transcription", async (req, res) => {
  try {
    if (!process.env.TRANSCRIPTION_API_URL || !process.env.TRANSCRIPTION_API_KEY) return res.status(503).json({ error: "Transcription integration is not configured" });
    const payload = await postJson(process.env.TRANSCRIPTION_API_URL, process.env.TRANSCRIPTION_API_KEY, req.body);
    res.json({ ok: true, payload });
  } catch (error) {
    res.status(502).json({ error: error?.message || "Transcription provider request failed" });
  }
});
router.post("/integrations/compensation/market-data", async (req, res) => {
  try {
    if (!process.env.COMPENSATION_API_URL || !process.env.COMPENSATION_API_KEY) return res.status(503).json({ error: "Compensation market-data integration is not configured" });
    const payload = await postJson(process.env.COMPENSATION_API_URL, process.env.COMPENSATION_API_KEY, req.body);
    res.json({ ok: true, payload });
  } catch (error) {
    res.status(502).json({ error: error?.message || "Compensation provider request failed" });
  }
});
router.post("/integrations/hris/employee", async (req, res) => {
  try {
    await requireApproval(req, String(req.body?.jobId || ""), "employee_create");
    if (!process.env.HRIS_API_URL || !process.env.HRIS_API_TOKEN) return res.status(503).json({ error: "HRIS integration is not configured" });
    const payload = await postJson(process.env.HRIS_API_URL, process.env.HRIS_API_TOKEN, req.body);
    res.json({ ok: true, payload });
  } catch (error) {
    res.status(502).json({ error: error?.message || "HRIS provider request failed" });
  }
});
var api_default = router;

// services/recruiting/documentRoutes.ts
import { Router as Router3 } from "express";

// services/recruiting/documentIngestion.ts
import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
async function extractDocumentText(input) {
  const filename = input.filename || "document";
  const mimeType = input.mimeType || "application/octet-stream";
  const lower = filename.toLowerCase();
  if (mimeType === "text/plain" || lower.endsWith(".txt") || lower.endsWith(".md")) {
    return { filename, mimeType, text: input.data.toString("utf8").trim() };
  }
  if (mimeType === "application/pdf" || lower.endsWith(".pdf")) {
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(input.data) }).promise;
    const chunks = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      chunks.push(content.items.map((item) => item.str || "").join(" "));
    }
    return { filename, mimeType, text: chunks.join("\n\n").replace(/\s+/g, " ").trim(), pages: pdf.numPages };
  }
  if (mimeType.includes("wordprocessingml") || lower.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer: input.data });
    return { filename, mimeType, text: result.value.replace(/\s+/g, " ").trim() };
  }
  throw new Error("Unsupported document type. Upload PDF, DOCX or TXT.");
}

// services/recruiting/documentStore.ts
import { createClient as createClient2 } from "@supabase/supabase-js";
function getAdminClient2() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase server credentials are not configured");
  return createClient2(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
async function saveRecruitingDocument(input) {
  if (!input.tenantId) throw new Error("tenantId is required");
  const { data, error } = await getAdminClient2().from("recruiting_documents").insert({
    tenant_id: input.tenantId,
    job_id: input.jobId || null,
    candidate_id: input.candidateId || null,
    filename: input.filename,
    mime_type: input.mimeType,
    extracted_text: input.extractedText
  }).select("id,filename,mime_type,created_at").single();
  if (error) throw new Error(`Unable to persist document: ${error.message}`);
  return data;
}

// services/recruiting/browserSourcing.ts
import { chromium } from "playwright";
import fs6 from "node:fs/promises";
import path6 from "node:path";
var PROFILE_ROOT = process.env.SMARTSCOUT_BROWSER_PROFILE_DIR || path6.join(process.cwd(), ".smartscout-browser");
function searchUrl(source, query) {
  if (source === "linkedin") return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(query)}`;
  return `https://www.naukri.com/search?keyword=${encodeURIComponent(query)}`;
}
function sourceHost(source) {
  return source === "linkedin" ? "linkedin.com" : "naukri.com";
}
async function ensureProfileDir(tenantId2) {
  const safe = tenantId2.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80) || "default";
  const dir = path6.join(PROFILE_ROOT, safe);
  await fs6.mkdir(dir, { recursive: true });
  return dir;
}
async function openContext(tenantId2) {
  return chromium.launchPersistentContext(await ensureProfileDir(tenantId2), {
    headless: process.env.SMARTSCOUT_BROWSER_HEADLESS !== "false",
    viewport: { width: 1440, height: 1e3 },
    locale: "en-IN"
  });
}
async function collectLinkedIn(page, limit) {
  return page.locator('a[href*="/in/"]').evaluateAll((links, max) => {
    const seen = /* @__PURE__ */ new Set();
    const out = [];
    for (const link of links) {
      const href = link.href.split("?")[0];
      const name = (link.textContent || "").trim().replace(/\s+/g, " ");
      if (!href || !name || seen.has(href) || !href.includes("linkedin.com/in/")) continue;
      seen.add(href);
      const card = link.closest("li") || link.parentElement?.parentElement;
      const text = (card?.textContent || link.textContent || "").trim().replace(/\s+/g, " ");
      out.push({ name, profileUrl: href, source: "linkedin", evidence: text ? [text.slice(0, 500)] : [] });
      if (out.length >= Number(max)) break;
    }
    return out;
  }, limit);
}
async function collectNaukri(page, limit) {
  return page.locator('a[href*="/profile/"]').evaluateAll((links, max) => {
    const seen = /* @__PURE__ */ new Set();
    const out = [];
    for (const link of links) {
      const href = link.href.split("?")[0];
      const name = (link.textContent || "").trim().replace(/\s+/g, " ");
      if (!href || !name || seen.has(href) || !href.includes("naukri.com/profile/")) continue;
      seen.add(href);
      const card = link.closest("article") || link.closest("li") || link.parentElement?.parentElement;
      const text = (card?.textContent || link.textContent || "").trim().replace(/\s+/g, " ");
      out.push({ name, profileUrl: href, source: "naukri", evidence: text ? [text.slice(0, 500)] : [] });
      if (out.length >= Number(max)) break;
    }
    return out;
  }, limit);
}
async function searchBrowserCandidates(tenantId2, source, query, limit = 8) {
  if (!tenantId2) throw new Error("Workspace identity is missing");
  if (!query.trim()) throw new Error("Search query is required");
  const context = await openContext(tenantId2);
  try {
    const page = await context.newPage();
    await page.goto(searchUrl(source, query), { waitUntil: "domcontentloaded", timeout: 45e3 });
    await page.waitForTimeout(1200);
    const body = (await page.locator("body").innerText()).slice(0, 4e3);
    if (/captcha|verify you are human|unusual traffic|access denied/i.test(body)) {
      throw new Error(`${source} requires a human verification step. Complete it in the browser session and retry.`);
    }
    const current = page.url();
    if (source === "linkedin" && /login|authwall/i.test(current)) throw new Error("LinkedIn session is not signed in. Sign in once in the SmartScout browser profile, then retry.");
    if (source === "naukri" && /login/i.test(current)) throw new Error("Naukri session is not signed in. Sign in once in the SmartScout browser profile, then retry.");
    const candidates = source === "linkedin" ? await collectLinkedIn(page, limit) : await collectNaukri(page, limit);
    return candidates.map((c) => ({ ...c, source: sourceHost(source) }));
  } finally {
    await context.close();
  }
}

// services/recruiting/documentRoutes.ts
var router2 = Router3();
router2.post("/candidate/ingest-document", async (req, res) => {
  try {
    const filename = String(req.body?.filename || "document");
    const mimeType = String(req.body?.mimeType || "application/octet-stream");
    const encoded = String(req.body?.dataBase64 || "");
    if (!encoded) return res.status(400).json({ error: "dataBase64 is required" });
    const data = Buffer.from(encoded, "base64");
    if (data.length > 15 * 1024 * 1024) return res.status(413).json({ error: "Document exceeds the 15 MB ingestion limit" });
    const document = await extractDocumentText({ filename, mimeType, data });
    const persisted = await saveRecruitingDocument({ tenantId: String(req.header("x-tenant-id") || ""), jobId: req.body?.jobId ? String(req.body.jobId) : void 0, candidateId: req.body?.candidateId ? String(req.body.candidateId) : void 0, filename: document.filename, mimeType: document.mimeType, extractedText: document.text });
    res.json({ ...document, persisted });
  } catch (error) {
    res.status(400).json({ error: error?.message || "Document ingestion failed" });
  }
});
router2.post("/browser-sourcing/search", async (req, res) => {
  try {
    const source = String(req.body?.source || "");
    const query = String(req.body?.query || "").trim();
    const limit = Math.min(Math.max(Number(req.body?.limit) || 8, 1), 25);
    if (!["linkedin", "naukri"].includes(source)) return res.status(400).json({ error: "source must be linkedin or naukri" });
    if (!query) return res.status(400).json({ error: "query is required" });
    const candidates = await searchBrowserCandidates(String(req.header("x-tenant-id") || ""), source, query, limit);
    res.json({ source, query, candidates });
  } catch (error) {
    res.status(400).json({ error: error?.message || "Browser sourcing failed" });
  }
});
var documentRoutes_default = router2;

// services/recruiting/browserSourceRoutes.ts
import { Router as Router4 } from "express";
var router3 = Router4();
async function requireJDApproval(tenantId2, jobId) {
  const approvals = await listApprovals(tenantId2, jobId);
  const approval = approvals.find((row) => row.action === "jd_approval");
  if (!approval || approval.status !== "approved") {
    throw new Error("Approve the JD before sourcing candidates.");
  }
}
router3.post("/browser-source/search", async (req, res) => {
  try {
    const tenantId2 = String(req.header("x-tenant-id") || "");
    const jobId = String(req.body?.jobId || "");
    const source = String(req.body?.source || "");
    const query = String(req.body?.query || "").trim();
    const limit = Math.min(Math.max(Number(req.body?.limit) || 8, 1), 20);
    if (!tenantId2) return res.status(400).json({ error: "Workspace identity is missing" });
    if (!jobId) return res.status(400).json({ error: "jobId is required" });
    if (!["linkedin", "naukri"].includes(source)) return res.status(400).json({ error: "source must be linkedin or naukri" });
    if (!query) return res.status(400).json({ error: "query is required" });
    await requireJDApproval(tenantId2, jobId);
    const candidates = await searchBrowserCandidates(tenantId2, source, query, limit);
    const savedCandidates = await saveCandidates(tenantId2, jobId, candidates);
    res.json({ jobId, source, query, candidates, savedCandidates });
  } catch (error) {
    res.status(400).json({ error: error?.message || "Browser sourcing failed" });
  }
});
var browserSourceRoutes_default = router3;

// services/recruiting/firebaseAuth.ts
import { createHmac, randomBytes as randomBytes2, timingSafeEqual, createHash as createHash2 } from "node:crypto";
var FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "gen-lang-client-0431516636";
var FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || "AIzaSyCK2ESnkH49-h9lUenEsvQvQwJSeRr3aVw";
var SESSION_SECRET = (() => {
  const explicit = process.env.SMARTSCOUT_SESSION_SECRET || process.env.SMARTSCOUT_VAULT_KEY;
  if (explicit) return explicit;
  const rootSecret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.GEMINI_API_KEY;
  if (!rootSecret) throw new Error("SMARTSCOUT_SESSION_SECRET or another server-only secret is required");
  return createHash2("sha256").update(`smartscout:session:${rootSecret}`).digest("hex");
})();
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
var __dirname = path7.dirname(__filename);
async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3e3;
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use((req, res, next) => {
    const requestId = String(req.header("x-request-id") || randomUUID());
    res.setHeader("x-request-id", requestId);
    const started = Date.now();
    res.on("finish", () => {
      if (req.path.startsWith("/api/")) console.log(JSON.stringify({ event: "http_request", requestId, method: req.method, path: req.path, status: res.statusCode, durationMs: Date.now() - started }));
    });
    next();
  });
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), geolocation=(), payment=(self), microphone=(self)");
    next();
  });
  app.use(express.json({ limit: "50mb" }));
  app.get("/api/recruiting/health", (_req, res) => {
    res.json({ ok: true, service: "smartscout-recruiting", version: process.env.GITHUB_SHA || "local" });
  });
  app.get("/api/recruiting/session", workspaceSessionInfo);
  const tenantId2 = (req) => authenticatedTenantId(req);
  app.use("/api/recruiting", requireWorkspaceAuth, api_default);
  app.use("/api/recruiting", requireWorkspaceAuth, documentRoutes_default);
  app.use("/api/recruiting", requireWorkspaceAuth, browserSourceRoutes_default);
  app.use("/api/control-plane", requireWorkspaceAuth, createControlPlaneRouter(tenantId2));
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
  app.post("/api/create-checkout-session", requireWorkspaceAuth, async (req, res) => {
    if (!stripe) return res.status(500).json({ error: "Stripe is not configured" });
    const { priceId, credits, packageName } = req.body || {};
    const normalizedPriceId = String(priceId || "").trim();
    const normalizedCredits = Number(credits);
    const normalizedPackage = String(packageName || "").trim().slice(0, 100);
    if (!normalizedPriceId || !Number.isFinite(normalizedCredits) || normalizedCredits <= 0 || normalizedCredits > 1e5 || !normalizedPackage) {
      return res.status(400).json({ error: "Valid priceId, credits and packageName are required" });
    }
    const origin = String(req.headers.origin || "").replace(/\/$/, "");
    const allowedOrigin = process.env.PUBLIC_BASE_URL ? process.env.PUBLIC_BASE_URL.replace(/\/$/, "") : origin;
    if (!allowedOrigin || !/^https?:\/\//i.test(allowedOrigin)) return res.status(400).json({ error: "A valid application origin is required" });
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{ price: normalizedPriceId, quantity: 1 }],
        mode: "payment",
        success_url: `${allowedOrigin}/?payment=success`,
        cancel_url: `${allowedOrigin}/?payment=cancel`,
        metadata: { tenantId: tenantId2(req), credits: String(normalizedCredits), packageName: normalizedPackage }
      });
      res.json({ id: session.id });
    } catch (err) {
      console.error("Stripe Session Error:", err);
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/send-report", requireWorkspaceAuth, async (req, res) => {
    const { recruiterEmail, candidateName, overallScore, status, reason, parameters = [], responses = [] } = req.body || {};
    if (!resend) return res.status(400).json({ success: false, error: "RESEND_API_KEY is not configured." });
    if (!String(recruiterEmail || "").trim() || !String(candidateName || "").trim()) return res.status(400).json({ success: false, error: "recruiterEmail and candidateName are required." });
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
      parameters.slice(0, 30).forEach((p) => {
        doc.text(`${String(p.name || "").slice(0, 80)}: ${Number(p.score) || 0}%`, 20, y);
        y += 10;
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
      });
      doc.setFontSize(16);
      doc.text("Q&A Transcript", 20, y + 10);
      doc.setFontSize(12);
      y += 20;
      responses.slice(0, 100).forEach((r, index) => {
        const q = doc.splitTextToSize(`Q${index + 1}: ${String(r.question || "")}`, 170);
        doc.text(q, 20, y);
        y += q.length * 7;
        const a = doc.splitTextToSize(`A: ${String(r.answer || "")}`, 170);
        doc.text(a, 20, y);
        y += a.length * 7 + 5;
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
      });
      const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
      const { data, error } = await resend.emails.send({ from: "SmartScout <reports@smartscout.online>", to: [String(recruiterEmail).trim()], subject: `Interview Report: ${String(candidateName).slice(0, 120)} (${status} - ${overallScore}%)`, attachments: [{ filename: `${String(candidateName).replace(/\s+/g, "_").slice(0, 80)}_Report.pdf`, content: pdfBuffer }], html: `<h1>Interview Report</h1><p><strong>Candidate:</strong> ${String(candidateName)}</p><p><strong>Overall Score:</strong> ${overallScore}%</p><p><strong>Status:</strong> ${String(status || "")}</p><p>${String(reason || "")}</p>` });
      if (error) return res.status(500).json({ success: false, error: error.message });
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/send-invitation", requireWorkspaceAuth, async (req, res) => {
    const { candidateEmail, candidateName, designation, company, jd, emailBody, scheduledAt, interviewLink } = req.body || {};
    if (!resend) return res.status(400).json({ success: false, error: "RESEND_API_KEY is not configured." });
    if (!String(candidateEmail || "").trim() || !String(candidateName || "").trim()) return res.status(400).json({ success: false, error: "candidateEmail and candidateName are required." });
    try {
      const attachments = [];
      if (jd) attachments.push({ filename: "job-description.txt", content: Buffer.from(String(jd).slice(0, 2e5)) });
      if (scheduledAt) {
        const date = new Date(scheduledAt);
        if (Number.isNaN(date.getTime())) return res.status(400).json({ success: false, error: "scheduledAt is invalid" });
        const event = { start: [date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes()], duration: { hours: 1 }, title: `AI Interview with ${String(company || "SmartScout").slice(0, 100)}: ${String(candidateName).slice(0, 100)} - ${String(designation || "Position").slice(0, 100)}`, description: `Your AI-powered audio interview is scheduled.

Interview Link: ${String(interviewLink || "")}

${String(emailBody || "")}`, location: "SmartScout AI Platform", url: interviewLink, status: "CONFIRMED", busyStatus: "BUSY", organizer: { name: "SmartScout Recruitment", email: "interviews@smartscout.online" }, attendees: [{ name: String(candidateName), email: String(candidateEmail), rsvp: true, partstat: "ACCEPTED", role: "REQ-PARTICIPANT" }] };
        const { error: error2, value } = ics.createEvent(event);
        if (!error2 && value) attachments.push({ filename: "interview-invite.ics", content: Buffer.from(value) });
      }
      const { data, error } = await resend.emails.send({ from: "SmartScout <interviews@smartscout.online>", to: [String(candidateEmail).trim()], subject: `Interview Invitation: ${String(company || "SmartScout").slice(0, 100)} - ${String(designation || "Position").slice(0, 100)}`, attachments, html: `<h1>Interview Invitation</h1><div style="white-space:pre-wrap">${String(emailBody || "")}</div>${scheduledAt ? `<p>Scheduled: ${new Date(scheduledAt).toLocaleString()}</p>` : ""}` });
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
    const distPath = path7.join(process.cwd(), "dist");
    app.use(express.static(distPath, { setHeaders: (res, filePath5) => {
      if (filePath5.endsWith(".html")) {
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
      }
    } }));
    app.get("*all", (_req, res) => {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.sendFile(path7.join(distPath, "index.html"));
    });
  }
  app.use((err, req, res, _next) => {
    const requestId = String(res.getHeader("x-request-id") || "unknown");
    console.error(JSON.stringify({ event: "unhandled_error", requestId, method: req.method, path: req.path, message: err?.message || "Unknown error" }));
    if (res.headersSent) return;
    res.status(500).json({ error: "Internal server error", requestId });
  });
  const server = app.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
  const shutdown = (signal) => {
    console.log(JSON.stringify({ event: "shutdown", signal }));
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 1e4).unref();
  };
  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));
}
startServer().catch((error) => {
  console.error(error);
  process.exit(1);
});
