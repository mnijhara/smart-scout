import React, { useState } from 'react';
import { FileText, Link2, Loader2, Upload, X } from 'lucide-react';

const MAX_BYTES = 8 * 1024 * 1024;

function setHiringPrompt(text: string) {
  const value = text.trim();
  if (!value) throw new Error('No readable job description was found.');
  const textarea = Array.from(document.querySelectorAll('textarea')).find((el) =>
    /vp hr|hiring intent|person you need/i.test(el.getAttribute('placeholder') || '')
  ) as HTMLTextAreaElement | undefined;
  if (!textarea) throw new Error('Open the hiring intent step before importing a JD.');
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
  setter?.call(textarea, value);
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  textarea.dispatchEvent(new Event('change', { bubbles: true }));
  textarea.focus();
}

async function extractPdf(buffer: ArrayBuffer) {
  const pdfjs: any = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer), disableWorker: true }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map((item: any) => item.str || '').join(' '));
  }
  return pages.join('\n\n');
}

async function extractDocx(buffer: ArrayBuffer) {
  const mammoth: any = await import('mammoth');
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value || '';
}

async function extractFile(file: File) {
  if (file.size > MAX_BYTES) throw new Error('Please use a JD smaller than 8 MB.');
  const buffer = await file.arrayBuffer();
  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) return extractPdf(buffer);
  if (/\.docx$/i.test(file.name) || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return extractDocx(buffer);
  return new TextDecoder().decode(buffer);
}

export default function JDImportBridge() {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function importFile(file?: File) {
    if (!file) return;
    setBusy(true); setError('');
    try { setHiringPrompt(await extractFile(file)); setOpen(false); }
    catch (e: any) { setError(e?.message || 'Unable to read this JD.'); }
    finally { setBusy(false); }
  }

  async function importUrl() {
    if (!url.trim()) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(url.trim(), { headers: { Accept: 'text/html,text/plain' } });
      if (!response.ok) throw new Error(`Could not read that URL (${response.status}).`);
      const type = response.headers.get('content-type') || '';
      if (!type.includes('text/') && !type.includes('html')) throw new Error('That URL does not expose readable text. Upload the JD file instead.');
      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      doc.querySelectorAll('script,style,noscript,svg').forEach((node) => node.remove());
      setHiringPrompt((doc.body?.innerText || html).replace(/\n{3,}/g, '\n\n'));
      setOpen(false);
    } catch (e: any) { setError(e?.message || 'Unable to read that URL. The site may block browser access; upload the JD instead.'); }
    finally { setBusy(false); }
  }

  return <>
    <button onClick={() => { setOpen(true); setError(''); }} className="fixed right-4 top-[4.75rem] z-40 inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-3 py-2 text-[11px] font-black text-violet-700 shadow-lg shadow-violet-100/70 sm:right-6" aria-label="Import an existing job description">
      <Upload className="h-3.5 w-3.5" /> Import JD
    </button>
    {open && <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:items-center sm:p-6" onClick={() => !busy && setOpen(false)}>
      <div className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl sm:p-7" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4"><div><div className="text-[10px] font-black uppercase tracking-[.2em] text-violet-600">Start faster</div><h2 className="mt-1 text-2xl font-black tracking-tight">Import an existing JD</h2><p className="mt-2 text-sm leading-6 text-slate-500">Upload PDF, DOCX or TXT, or paste a public job-posting URL. Smart Scout will put the text into the hiring prompt for AI analysis.</p></div><button disabled={busy} onClick={() => setOpen(false)} className="rounded-xl p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
        <label className="mt-6 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/50 px-5 py-6 text-sm font-black text-violet-700 hover:bg-violet-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} {busy ? 'Reading JD…' : 'Choose JD file'}
          <input type="file" hidden accept=".pdf,.docx,.txt" disabled={busy} onChange={(e) => importFile(e.target.files?.[0])} />
        </label>
        <div className="my-5 flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-400"><span className="h-px flex-1 bg-slate-200" />or<span className="h-px flex-1 bg-slate-200" /></div>
        <div className="flex gap-2"><div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 px-3"><Link2 className="h-4 w-4 text-slate-400" /><input value={url} onChange={(e) => setUrl(e.target.value)} disabled={busy} placeholder="https://company.com/jobs/role" className="min-w-0 flex-1 py-3 text-sm outline-none" /></div><button onClick={importUrl} disabled={busy || !url.trim()} className="rounded-xl bg-slate-950 px-4 text-xs font-black text-white disabled:opacity-40">Import</button></div>
        {error && <div className="mt-4 rounded-xl bg-rose-50 p-3 text-xs leading-5 text-rose-700">{error}</div>}
        <div className="mt-5 text-[10px] leading-5 text-slate-400">Imported content is placed into the hiring prompt; it is not automatically sourced or published. The recruiter still reviews and approves the generated JD.</div>
      </div>
    </div>}
  </>;
}
