export type WebCandidate = { name: string; headline?: string; location?: string; profileUrl: string; source: string; summary?: string; evidence: string[] };

function cleanJson(text: string) { return text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim(); }
function hostname(url: string) { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } }

export async function searchWebCandidates(apiKey: string, role: any, limit = 8): Promise<WebCandidate[]> {
  const prompt = `Find real public professional profiles suitable for this hiring role using Google Search. Return ONLY JSON, no markdown: {"candidates":[{"name":string,"headline":string,"location":string,"profileUrl":string,"source":string,"summary":string,"evidence":string[]}]}. Do not invent people, URLs, employers, or evidence. Only include candidates whose public profile/search result provides enough evidence to justify relevance. Prefer LinkedIn and credible public professional pages. Every candidate MUST have a real public profileUrl, a source hostname or publisher, and at least one concrete evidence item tied to the role. Maximum ${limit} candidates. ROLE: ${JSON.stringify(role)}`;
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
      generationConfig: { maxOutputTokens: 5000 }
    })
  });
  const data: any = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || `Candidate search failed (${response.status})`);
  const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join('') || '';
  let parsed: any;
  try { parsed = JSON.parse(cleanJson(text)); } catch { throw new Error('Candidate search returned invalid structured data. Please retry the search.'); }
  const seen = new Set<string>();
  return (Array.isArray(parsed?.candidates) ? parsed.candidates : [])
    .map((c: any) => ({
      ...c,
      profileUrl: String(c?.profileUrl || '').trim(),
      source: String(c?.source || '').trim() || hostname(String(c?.profileUrl || '')),
      evidence: Array.isArray(c?.evidence) ? c.evidence.map((x: any) => String(x).trim()).filter(Boolean) : []
    }))
    .filter((c: WebCandidate) => {
      const key = c.profileUrl.toLowerCase();
      if (!c.name || !key || !c.source || !c.evidence.length || seen.has(key)) return false;
      let url: URL;
      try { url = new URL(c.profileUrl); } catch { return false; }
      if (!['http:', 'https:'].includes(url.protocol)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}
