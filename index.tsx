import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

console.log("Mounting Application...");

const container = document.getElementById('root');

if (container) {
  try {
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log("Application Mounted.");
  } catch (e) {
    console.error("Mounting Error:", e);
    // Force a visual error if React fails to mount entirely
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