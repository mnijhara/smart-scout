export type WebCandidate = { name: string; headline?: string; location?: string; profileUrl?: string; source?: string; summary?: string; evidence?: string[] };

function cleanJson(text: string) { return text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim(); }

export async function searchWebCandidates(apiKey: string, role: any, limit = 8): Promise<WebCandidate[]> {
  const prompt = `Find real public professional profiles suitable for this hiring role using Google Search. Return ONLY JSON, no markdown: {"candidates":[{"name":string,"headline":string,"location":string,"profileUrl":string,"source":string,"summary":string,"evidence":string[]}]}. Do not invent people, URLs, employers, or evidence. Only include candidates whose public profile/search result provides enough evidence to justify relevance. Prefer LinkedIn and credible public professional pages. Maximum ${limit} candidates. ROLE: ${JSON.stringify(role)}`;
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], tools: [{ google_search: {} }], generationConfig: { temperature: 0.1, maxOutputTokens: 5000 } })
  });
  const data: any = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || `Candidate search failed (${response.status})`);
  const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join('') || '';
  const parsed = JSON.parse(cleanJson(text));
  return Array.isArray(parsed?.candidates) ? parsed.candidates.filter((c: any) => c?.name && c?.profileUrl) : [];
}
