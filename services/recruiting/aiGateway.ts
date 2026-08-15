export type AIProvider = 'gemini'|'openai'|'anthropic';

export type AIRequest = { provider:AIProvider; apiKey:string; model?:string; system?:string; prompt:string; temperature?:number; maxTokens?:number };
export type AIResponse = { provider:AIProvider; model:string; text:string; usage?:{inputTokens?:number;outputTokens?:number} };

const DEFAULT_MODELS:Record<AIProvider,string>={gemini:'gemini-3.6-flash',openai:'gpt-4.1-mini',anthropic:'claude-3-5-haiku-latest'};
function cleanText(value:unknown):string{return typeof value==='string'?value.trim():'';}
function cleanKey(value:string):string{return String(value||'').trim().replace(/^(["'`])|(["'`])$/g,'');}

async function callGemini(request:AIRequest):Promise<AIResponse>{
 const model=request.model||DEFAULT_MODELS.gemini;
 const isGemini3=/^gemini-3(?:\.|-)/.test(model);
 const generationConfig:Record<string,unknown>={maxOutputTokens:request.maxTokens??2000};
 if(!isGemini3)generationConfig.temperature=request.temperature??0.2;
 const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{
  method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':cleanKey(request.apiKey)},
  body:JSON.stringify({systemInstruction:request.system?{parts:[{text:request.system}]}:undefined,contents:[{role:'user',parts:[{text:request.prompt}]}],generationConfig})
 });
 const data:any=await response.json();
 if(!response.ok){
  const reason=String(data?.error?.status||data?.error?.details?.find((d:any)=>d?.reason)?.reason||'');
  const message=String(data?.error?.message||`Gemini request failed (${response.status})`);
  if(reason==='API_KEY_INVALID'||/API key not valid/i.test(message))throw new Error('Google rejected this Gemini API key. Use an active Gemini API key from Google AI Studio; if the key is restricted to browser HTTP referrers, create a server-safe key because Smart Scout validates it securely on the server.');
  throw new Error(message);
 }
 const text=cleanText(data?.candidates?.[0]?.content?.parts?.map((part:any)=>part?.text).filter(Boolean).join(''));
 if(!text)throw new Error('Gemini returned an empty response');
 return {provider:'gemini',model,text,usage:{inputTokens:data?.usageMetadata?.promptTokenCount,outputTokens:data?.usageMetadata?.candidatesTokenCount}};
}

async function callOpenAI(request:AIRequest):Promise<AIResponse>{
 const model=request.model||DEFAULT_MODELS.openai;
 const response=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${cleanKey(request.apiKey)}`},body:JSON.stringify({model,messages:[...(request.system?[{role:'system',content:request.system}]:[]),{role:'user',content:request.prompt}],temperature:request.temperature??0.2,max_tokens:request.maxTokens??2000})});
 const data:any=await response.json();if(!response.ok)throw new Error(data?.error?.message||`OpenAI request failed (${response.status})`);const text=cleanText(data?.choices?.[0]?.message?.content);if(!text)throw new Error('OpenAI returned an empty response');return {provider:'openai',model,text,usage:{inputTokens:data?.usage?.prompt_tokens,outputTokens:data?.usage?.completion_tokens}};
}

async function callAnthropic(request:AIRequest):Promise<AIResponse>{
 const model=request.model||DEFAULT_MODELS.anthropic;
 const response=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':cleanKey(request.apiKey),'anthropic-version':'2023-06-01'},body:JSON.stringify({model,max_tokens:request.maxTokens??2000,temperature:request.temperature??0.2,system:request.system,messages:[{role:'user',content:request.prompt}]})});
 const data:any=await response.json();if(!response.ok)throw new Error(data?.error?.message||`Anthropic request failed (${response.status})`);const text=cleanText(data?.content?.filter((item:any)=>item?.type==='text').map((item:any)=>item.text).join(''));if(!text)throw new Error('Anthropic returned an empty response');return {provider:'anthropic',model,text,usage:{inputTokens:data?.usage?.input_tokens,outputTokens:data?.usage?.output_tokens}};
}

export async function generateAI(request:AIRequest):Promise<AIResponse>{const apiKey=cleanKey(request.apiKey);if(!apiKey)throw new Error('AI provider credential is not configured');if(!request.prompt?.trim())throw new Error('AI prompt is required');switch(request.provider){case'gemini':return callGemini({...request,apiKey});case'openai':return callOpenAI({...request,apiKey});case'anthropic':return callAnthropic({...request,apiKey});default:throw new Error(`Unsupported AI provider: ${String(request.provider)}`);}}
export async function testAIProvider(provider:AIProvider,apiKey:string,model?:string):Promise<AIResponse>{return generateAI({provider,apiKey,model,system:'You are a connectivity test for Smart Scout. Respond with exactly: SMARTSCOUT_OK',prompt:'Test the provider connection.',temperature:0,maxTokens:20});}
