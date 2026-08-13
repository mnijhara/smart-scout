// server.ts
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { Resend } from "resend";
import * as ics from "ics";
import Stripe from "stripe";
import { jsPDF } from "jspdf";

// services/recruiting/api.ts
import { Router } from "express";

// services/recruiting/aiGateway.ts
var DEFAULT_MODELS = {
  gemini: "gemini-2.5-flash",
  openai: "gpt-4.1-mini",
  anthropic: "claude-3-5-haiku-latest"
};
function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}
async function callGemini(request) {
  const model = request.model || DEFAULT_MODELS.gemini;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(request.apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: request.system ? { parts: [{ text: request.system }] } : void 0,
      contents: [{ role: "user", parts: [{ text: request.prompt }] }],
      generationConfig: {
        temperature: request.temperature ?? 0.2,
        maxOutputTokens: request.maxTokens ?? 2e3
      }
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
    hrisPayload: {
      name: input.candidateName,
      jobTitle: input.role,
      department: input.department,
      location: input.location,
      manager: input.manager,
      startDate: start
    }
  };
}

// services/recruiting/webSourcing.ts
function cleanJson(text) {
  return text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
}
async function searchWebCandidates(apiKey, role, limit = 8) {
  const prompt = `Find real public professional profiles suitable for this hiring role using Google Search. Return ONLY JSON, no markdown: {"candidates":[{"name":string,"headline":string,"location":string,"profileUrl":string,"source":string,"summary":string,"evidence":string[]}]}. Do not invent people, URLs, employers, or evidence. Only include candidates whose public profile/search result provides enough evidence to justify relevance. Prefer LinkedIn and credible public professional pages. Maximum ${limit} candidates. ROLE: ${JSON.stringify(role)}`;
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], tools: [{ google_search: {} }], generationConfig: { temperature: 0.1, maxOutputTokens: 5e3 } })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || `Candidate search failed (${response.status})`);
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p?.text).filter(Boolean).join("") || "";
  const parsed = JSON.parse(cleanJson(text));
  return Array.isArray(parsed?.candidates) ? parsed.candidates.filter((c) => c?.name && c?.profileUrl) : [];
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
  const now = (/* @__PURE__ */ new Date()).toISOString();
  return { tenantId: tenantId2, provider, ciphertext: ciphertext.toString("base64"), iv: iv.toString("base64"), tag: tag.toString("base64"), createdAt: now, updatedAt: now };
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
    const credential = { provider: "gemini", apiKey: process.env.GEMINI_API_KEY, model: "gemini-2.5-flash" };
    sessions.set(tenant, credential);
    return credential;
  }
  const providers = await listAIProviders(tenant).catch(() => []);
  const provider = providers[0];
  if (provider) {
    const apiKey = await getAICredential(tenant, provider);
    if (apiKey) {
      const credential = { provider, apiKey, model: provider === "gemini" ? "gemini-2.5-flash" : void 0 };
      sessions.set(tenant, credential);
      return credential;
    }
  }
  throw new Error("Connect an AI provider first");
}
async function validateCredential(provider, apiKey, model) {
  await generateAI({ provider, apiKey, model: model || (provider === "gemini" ? "gemini-2.5-flash" : void 0), system: "You are a connectivity check. Reply with OK only.", prompt: "OK", temperature: 0, maxTokens: 8 });
}
router.get("/health", (_req, res) => res.json({ ok: true, service: "recruiting-os" }));
router.post("/ai/connect", async (req, res) => {
  try {
    const { provider, apiKey, model } = req.body || {};
    if (!["gemini", "openai", "anthropic"].includes(provider)) return res.status(400).json({ error: "Unsupported provider" });
    const secret = String(apiKey || "").trim();
    if (secret.length < 8) return res.status(400).json({ error: "API key is required" });
    const selectedModel = model || (provider === "gemini" ? "gemini-2.5-flash" : void 0);
    await validateCredential(provider, secret, selectedModel);
    const tenant = tenantId(req);
    sessions.set(tenant, { provider, apiKey: secret, model: selectedModel });
    let persistent = false;
    try {
      await saveAICredential(tenant, provider, secret);
      persistent = true;
    } catch (persistenceError) {
      console.warn("AI credential persistence unavailable:", persistenceError?.message || persistenceError);
    }
    res.json({ connected: true, provider, model: selectedModel, persistent, masked: `${secret.slice(0, 4)}\u2022\u2022\u2022\u2022${secret.slice(-4)}` });
  } catch (error) {
    res.status(400).json({ error: error?.message || "Unable to connect AI provider" });
  }
});
router.get("/ai/status", async (req, res) => {
  try {
    const tenant = tenantId(req);
    const session = sessions.get(tenant);
    if (session) return res.json({ connected: true, provider: session.provider, model: session.model });
    const providers = await listAIProviders(tenant).catch(() => []);
    if (providers.length) return res.json({ connected: true, provider: providers[0], model: providers[0] === "gemini" ? "gemini-2.5-flash" : null });
    if (process.env.GEMINI_API_KEY) return res.json({ connected: true, provider: "gemini", model: "gemini-2.5-flash", source: "environment" });
    return res.json({ connected: false, provider: null, model: null });
  } catch (error) {
    res.status(500).json({ error: error?.message || "Unable to read AI status" });
  }
});
router.delete("/ai/disconnect", async (req, res) => {
  const tenant = tenantId(req);
  const session = sessions.get(tenant);
  sessions.delete(tenant);
  if (session) {
    try {
      await deleteAICredential(tenant, session.provider);
    } catch (error) {
      console.warn("AI credential delete unavailable:", error?.message || error);
    }
  }
  res.json({ connected: false });
});
router.post("/jd/analyze", async (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text?.trim()) return res.status(400).json({ error: "Job description text is required" });
    const c = await getCredential(req);
    res.json(await analyzeJD(text, c.provider, c.apiKey, c.model));
  } catch (error) {
    res.status(400).json({ error: error?.message || "JD analysis failed" });
  }
});
router.post("/source/search", async (req, res) => {
  try {
    const c = await getCredential(req);
    if (c.provider !== "gemini") return res.status(400).json({ error: "Candidate web sourcing currently requires Gemini" });
    res.json({ candidates: await searchWebCandidates(c.apiKey, req.body?.role, Number(req.body?.limit) || 8) });
  } catch (error) {
    res.status(400).json({ error: error?.message || "Candidate sourcing failed" });
  }
});
router.post("/candidate/score", async (req, res) => {
  try {
    const { candidate, requirement } = req.body || {};
    if (!candidate || !requirement) return res.status(400).json({ error: "candidate and requirement are required" });
    const c = await getCredential(req);
    res.json(await scoreCandidate(candidate, requirement, c.provider, c.apiKey, c.model));
  } catch (error) {
    res.status(400).json({ error: error?.message || "Candidate scoring failed" });
  }
});
router.post("/interview/plan", (req, res) => res.json(buildInterviewPlan(String(req.body?.role || "the role"), Array.isArray(req.body?.competencies) ? req.body.competencies : [])));
router.post("/decision", (req, res) => {
  try {
    res.json(makeHiringDecision(req.body));
  } catch (error) {
    res.status(400).json({ error: error?.message || "Decision failed" });
  }
});
router.post("/compensation/recommend", (req, res) => {
  try {
    res.json(recommendCompensation(req.body?.observations || [], req.body?.internalComparable));
  } catch (error) {
    res.status(400).json({ error: error?.message || "Compensation analysis failed" });
  }
});
router.post("/offer/draft", (req, res) => {
  try {
    res.json(createOffer(req.body));
  } catch (error) {
    res.status(400).json({ error: error?.message || "Offer draft failed" });
  }
});
router.post("/engagement/plan", (req, res) => res.json(buildEngagementPlan(String(req.body?.candidateName || "there"))));
router.post("/onboarding/plan", (req, res) => res.json(buildOnboardingPlan(req.body || {})));
var api_default = router;

// server.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3e3;
  app.use(express.json({ limit: "50mb" }));
  app.use("/api/recruiting", api_default);
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
  app.post("/api/create-checkout-session", async (req, res) => {
    if (!stripe) return res.status(500).json({ error: "Stripe is not configured" });
    const { priceId, userId, credits, packageName } = req.body;
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "payment",
        success_url: `${req.headers.origin}/?payment=success&credits=${credits}&package=${encodeURIComponent(packageName)}`,
        cancel_url: `${req.headers.origin}/?payment=cancel`,
        metadata: { userId, credits: credits.toString(), packageName }
      });
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
      const { data, error } = await resend.emails.send({
        from: "SmartScout <reports@smartscout.online>",
        to: [recruiterEmail],
        subject: `Interview Report: ${candidateName} (${status} - ${overallScore}%)`,
        attachments: [{ filename: `${candidateName.replace(/\s+/g, "_")}_Report.pdf`, content: pdfBuffer }],
        html: `<h1>Interview Report</h1><p><strong>Candidate:</strong> ${candidateName}</p><p><strong>Overall Score:</strong> ${overallScore}%</p><p><strong>Status:</strong> ${status}</p><p>${String(reason || "")}</p>`
      });
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
        const event = {
          start: [date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes()],
          duration: { hours: 1 },
          title: `AI Interview with ${company || "SmartScout"}: ${candidateName} - ${designation || "Position"}`,
          description: `Your AI-powered audio interview is scheduled.

Interview Link: ${interviewLink}

${emailBody}`,
          location: "SmartScout AI Platform",
          url: interviewLink,
          status: "CONFIRMED",
          busyStatus: "BUSY",
          organizer: { name: "SmartScout Recruitment", email: "interviews@smartscout.online" },
          attendees: [{ name: candidateName, email: candidateEmail, rsvp: true, partstat: "ACCEPTED", role: "REQ-PARTICIPANT" }]
        };
        const { error: error2, value } = ics.createEvent(event);
        if (!error2 && value) attachments.push({ filename: "interview-invite.ics", content: Buffer.from(value) });
      }
      const { data, error } = await resend.emails.send({
        from: "SmartScout <interviews@smartscout.online>",
        to: [candidateEmail],
        subject: `Interview Invitation: ${company || "SmartScout"} - ${designation || "Position"}`,
        attachments,
        html: `<h1>Interview Invitation</h1><div style="white-space:pre-wrap">${emailBody}</div>${scheduledAt ? `<p>Scheduled: ${new Date(scheduledAt).toLocaleString()}</p>` : ""}`
      });
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
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }
  app.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
}
startServer();
