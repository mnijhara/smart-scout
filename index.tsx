import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import RecruitingOS from './components/RecruitingOS';
import JobIntelligence from './components/JobIntelligence';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  const params = new URLSearchParams(window.location.search);
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  const feature = params.get('feature');
  root.render(
    <React.StrictMode>
      {path === '/old' ? <App /> : feature === 'job' ? <JobIntelligence onBack={() => window.location.assign('/')} /> : <RecruitingOS />}
    </React.StrictMode>
  );
}
