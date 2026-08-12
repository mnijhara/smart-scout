export type AIProvider = 'gemini' | 'openai' | 'anthropic';

export type AIRequest = {
  provider: AIProvider;
  apiKey: string;
  model?: string;
  system?: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
};

export type AIResponse = {
  provider: AIProvider;
  model: string;
  text: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
};

const DEFAULT_MODELS: Record<AIProvider, string> = {
  gemini: 'gemini-2.5-flash',
  openai: 'gpt-4.1-mini',
  anthropic: 'claude-3-5-haiku-latest',
};

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

async function callGemini(request: AIRequest): Promise<AIResponse> {
  const model = request.model || DEFAULT_MODELS.gemini;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(request.apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: request.system ? { parts: [{ text: request.system }] } : undefined,
      contents: [{ role: 'user', parts: [{ text: request.prompt }] }],
      generationConfig: {
        temperature: request.temperature ?? 0.2,
        maxOutputTokens: request.maxTokens ?? 2000,
      },
    }),
  });
  const data: any = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || `Gemini request failed (${response.status})`);
  const text = cleanText(data?.candidates?.[0]?.content?.parts?.map((part: any) => part?.text).filter(Boolean).join(''));
  if (!text) throw new Error('Gemini returned an empty response');
  return {
    provider: 'gemini',
    model,
    text,
    usage: {
      inputTokens: data?.usageMetadata?.promptTokenCount,
      outputTokens: data?.usageMetadata?.candidatesTokenCount,
    },
  };
}

async function callOpenAI(request: AIRequest): Promise<AIResponse> {
  const model = request.model || DEFAULT_MODELS.openai;
  const messages = [
    ...(request.system ? [{ role: 'system', content: request.system }] : []),
    { role: 'user', content: request.prompt },
  ];
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${request.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: request.temperature ?? 0.2,
      max_tokens: request.maxTokens ?? 2000,
    }),
  });
  const data: any = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || `OpenAI request failed (${response.status})`);
  const text = cleanText(data?.choices?.[0]?.message?.content);
  if (!text) throw new Error('OpenAI returned an empty response');
  return {
    provider: 'openai',
    model,
    text,
    usage: {
      inputTokens: data?.usage?.prompt_tokens,
      outputTokens: data?.usage?.completion_tokens,
    },
  };
}

async function callAnthropic(request: AIRequest): Promise<AIResponse> {
  const model = request.model || DEFAULT_MODELS.anthropic;
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': request.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: request.maxTokens ?? 2000,
      temperature: request.temperature ?? 0.2,
      system: request.system,
      messages: [{ role: 'user', content: request.prompt }],
    }),
  });
  const data: any = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || `Anthropic request failed (${response.status})`);
  const text = cleanText(data?.content?.filter((item: any) => item?.type === 'text').map((item: any) => item.text).join(''));
  if (!text) throw new Error('Anthropic returned an empty response');
  return {
    provider: 'anthropic',
    model,
    text,
    usage: {
      inputTokens: data?.usage?.input_tokens,
      outputTokens: data?.usage?.output_tokens,
    },
  };
}

export async function generateAI(request: AIRequest): Promise<AIResponse> {
  if (!request.apiKey) throw new Error('AI provider credential is not configured');
  if (!request.prompt?.trim()) throw new Error('AI prompt is required');
  switch (request.provider) {
    case 'gemini': return callGemini(request);
    case 'openai': return callOpenAI(request);
    case 'anthropic': return callAnthropic(request);
    default: throw new Error(`Unsupported AI provider: ${String(request.provider)}`);
  }
}

export async function testAIProvider(provider: AIProvider, apiKey: string, model?: string): Promise<AIResponse> {
  return generateAI({
    provider,
    apiKey,
    model,
    system: 'You are a connectivity test for Smart Scout. Respond with exactly: SMARTSCOUT_OK',
    prompt: 'Test the provider connection.',
    temperature: 0,
    maxTokens: 20,
  });
}
