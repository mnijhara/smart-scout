import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import HiringLifecycleRelease from './components/HiringLifecycleRelease';
import JDImportBridge from './components/JDImportBridge';
import LandingPageRelease from './components/LandingPageRelease';
import AuthGateRelease from './components/AuthGateRelease';
import './hire-ui.css';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  const publicHome = <LandingPageRelease onStart={() => window.location.assign('/hire')} />;
  const lifecycle = <AuthGateRelease><><JDImportBridge /><HiringLifecycleRelease onBack={() => window.location.assign('/')} /></AuthGateRelease>;
  const view = path === '/old' ? <App /> : path === '/hire' ? lifecycle : publicHome;
  root.render(<React.StrictMode>{view}</React.StrictMode>);
}
