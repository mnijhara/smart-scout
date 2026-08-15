import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import HiringLifecycleV2 from './components/HiringLifecycleV2';
import LandingPage from './components/LandingPage';
import './hire-ui.css';

const container = document.getElementById('root');

if (container) {
  const root = createRoot(container);
  const path = window.location.pathname.replace(/\/$/, '') || '/';

  // The Recruiting OS is now the product home. The legacy dashboard remains
  // available at /old while the public/marketing landing page remains at /home.
  const view =
    path === '/old' ? <App /> :
    path === '/home' ? <LandingPage onUseOwn={() => window.location.assign('/')} /> :
    <HiringLifecycleV2 onBack={() => window.location.assign('/home')} />;

  root.render(<React.StrictMode>{view}</React.StrictMode>);
}
