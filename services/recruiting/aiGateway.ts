export type AIProvider='gemini'|'openai'|'anthropic';
export type AIRequest={provider:AIProvider;apiKey:string;model?:string;system?:string;prompt:string;temperature?:number;maxTokens?:number};
export type AIResponse={provider:AIProvider;model:string;text:string;usage?:{inputTokens?:number;outputTokens?:number}};
const DEFAULT_MODELS:Record<AIProvider,string>={gemini:'gemini-3.6-flash',openai:'gpt-4.1-mini',anthropic:'claude-3-5-haiku-latest'};
function cleanText(value:unknown):string{return typeof value==='string'?value.trim():'';}
function cleanKey(value:string):string{return String(value||'').trim().replace(/^(["'`])|(["'`])$/g,'');}
function normalizeGeminiModel(model?:string):string{const value=String(model||'').trim();if(!value)return DEFAULT_MODELS.gemini;const aliases:Record<string,string>={'gemini-2.5-flash':'gemini-3.6-flash','gemini-2.5-flash-preview-09-2025':'gemini-3.6-flash','gemini-3-flash-preview':'gemini-3.6-flash','gemini-flash-latest':'gemini-3.6-flash'};return aliases[value]||value;}

async function callGemini(request:AIRequest):Promise<AIResponse>{
 const model=normalizeGeminiModel(request.model);
 const isGemini3=/^gemini-3(?:\.|-)/.test(model);
 const generationConfig:Record<string,unknown>={maxOutputTokens:request.maxTokens??2000};
 if(!isGemini3)generationConfig.temperature=request.temperature??0.2;
 const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':cleanKey(request.apiKey)},body:JSON.stringify({systemInstruction:request.system?{parts:[{text:request.system}]}:undefined,contents:[{role:'user',parts:[{text:request.prompt}]}],generationConfig})});
 const data:any=await response.json();
 if(!response.ok){
  const reason=String(data?.error?.status||data?.error?.details?.find((d:any)=>d?.reason)?.reason||'');
  const message=String(data?.error?.message||`Gemini request failed (${response.status})`);
  if(reason==='API_KEY_INVALID'||/API key not valid/i.test(message))throw new Error('Google rejected this Gemini API key. Use an active Gemini API key from Google AI Studio.');
  if(response.status===403)throw new Error(`Gemini access was denied: ${message}`);
  throw new Error(message);
 }
 const candidates=Array.isArray(data?.candidates)?data.candidates:[];
 const text=cleanText(candidates.flatMap((candidate:any)=>Array.isArray(candidate?.content?.parts)?candidate.content.parts:[]).map((part:any)=>part?.text).filter(Boolean).join(''));
 if(!text){const finish=String(candidates[0]?.finishReason||'');const block=String(data?.promptFeedback?.blockReason||'');if(block)throw new Error(`Gemini blocked the connectivity test (${block}).`);if(finish==='MAX_TOKENS')throw new Error('Gemini used the available thinking/output budget before returning text.');throw new Error(`Gemini returned no text (finishReason: ${finish||'unknown'}).`);}
 return{provider:'gemini',model,text,usage:{inputTokens:data?.usageMetadata?.promptTokenCount,outputTokens:data?.usageMetadata?.candidatesTokenCount}};
}

async function callOpenAI(request:AIRequest):Promise<AIResponse>{const model=request.model||DEFAULT_MODELS.openai;const response=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${cleanKey(request.apiKey)}`},body:JSON.stringify({model,messages:[...(request.system?[{role:'system',content:request.system}]:[]),{role:'user',content:request.prompt}],temperature:request.temperature??0.2,max_tokens:request.maxTokens??2000})});const data:any=await response.json();if(!response.ok)throw new Error(data?.error?.message||`OpenAI request failed (${response.status})`);const text=cleanText(data?.choices?.[0]?.message?.content);if(!text)throw new Error('OpenAI returned an empty response');return{provider:'openai',model,text,usage:{inputTokens:data?.usage?.prompt_tokens,outputTokens:data?.usage?.completion_tokens}};}
async function callAnthropic(request:AIRequest):Promise<AIResponse>{const model=request.model||DEFAULT_MODELS.anthropic;const response=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':cleanKey(request.apiKey),'anthropic-version':'2023-06-01'},body:JSON.stringify({model,max_tokens:request.maxTokens??2000,temperature:request.temperature??0.2,system:request.system,messages:[{role:'user',content:request.prompt}]})});const data:any=await response.json();if(!response.ok)throw new Error(data?.error?.message||`Anthropic request failed (${response.status})`);const text=cleanText(data?.content?.filter((item:any)=>item?.type==='text').map((item:any)=>item.text).join(''));if(!text)throw new Error('Anthropic returned an empty response');return{provider:'anthropic',model,text,usage:{inputTokens:data?.usage?.input_tokens,outputTokens:data?.usage?.output_tokens}};}
export async function generateAI(request:AIRequest):Promise<AIResponse>{const apiKey=cleanKey(request.apiKey);if(!apiKey)throw new Error('AI provider credential is not configured');if(!request.prompt?.trim())throw new Error('AI prompt is required');switch(request.provider){case'gemini':return callGemini({...request,apiKey,model:normalizeGeminiModel(request.model)});case'openai':return callOpenAI({...request,apiKey});case'anthropic':return callAnthropic({...request,apiKey});default:throw new Error(`Unsupported AI provider: ${String(request.provider)}`);}}
export async function testAIProvider(provider:AIProvider,apiKey:string,model?:string):Promise<AIResponse>{return generateAI({provider,apiKey,model,system:'You are a connectivity test for Smart Scout. Reply with exactly SMARTSCOUT_OK.',prompt:'Reply with SMARTSCOUT_OK.',temperature:0,maxTokens:256});}
export async function* streamAI(request:AIRequest):AsyncGenerator<string>{const response=await generateAI(request);if(response.text)yield response.text;}