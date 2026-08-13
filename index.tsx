import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import RecruitingOS from './components/RecruitingOS';
import JobIntelligence from './components/JobIntelligence';

console.log('Mounting Application...');

const container = document.getElementById('root');

if (container) {
  try {
    const root = createRoot(container);
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
    const isRecruitingOS = params.get('os') === '1';
    const feature = params.get('feature');

    root.render(
      <React.StrictMode>
        {isRecruitingOS && feature === 'job' ? <JobIntelligence onBack={() => window.location.assign('/?os=1')} /> : isRecruitingOS ? <RecruitingOS /> : <App />}
      </React.StrictMode>
    );
    console.log('Application Mounted.');
  } catch (e) {
    console.error('Mounting Error:', e);
    if (container) {
      container.innerHTML = `
        <div style="padding:20px;color:#f43f5e;font-family:sans-serif;text-align:center">
          <h1>Critical Error</h1>
          <p>Application failed to mount.</p>
          <pre style="text-align:left;background:#000;padding:10px;border-radius:8px">${e}</pre>
        </div>
      `;
    }
    throw e;
  }
} else {
  console.error('FATAL: Root container missing');
}
