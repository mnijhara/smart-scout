import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import RecruitingOS from './components/RecruitingOS';

console.log("Mounting Application...");

const container = document.getElementById('root');

if (container) {
  try {
    const root = createRoot(container);
    const isRecruitingOS = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('os') === '1';

    root.render(
      <React.StrictMode>
        {isRecruitingOS ? <RecruitingOS /> : <App />}
      </React.StrictMode>
    );
    console.log("Application Mounted.");
  } catch (e) {
    console.error("Mounting Error:", e);
    if (container) {
      container.innerHTML = `
        <div style="padding: 20px; color: #f43f5e; font-family: sans-serif; text-align: center;">
          <h1>Critical Error</h1>
          <p>Application failed to mount.</p>
          <pre style="text-align:left; background: #000; padding: 10px; border-radius: 5px;">${e}</pre>
        </div>
      `;
    }
    throw e;
  }
} else {
  console.error("FATAL: Root container missing");
}
