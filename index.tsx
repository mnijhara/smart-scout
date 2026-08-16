import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import HiringLifecycleV3 from './components/HiringLifecycleV3';
import JDImportBridge from './components/JDImportBridge';
import LandingPageFinal from './components/LandingPageFinal';
import MagicHiringDemoV3 from './components/MagicHiringDemoV3';
import AuthGate from './components/AuthGate';
import './hire-ui.css';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  const publicHome = <><LandingPageFinal onStart={() => window.location.assign('/hire')} /><MagicHiringDemoV3 onUseOwn={() => window.location.assign('/hire')} /></>;
  const lifecycle = <AuthGate><><JDImportBridge /><HiringLifecycleV3 onBack={() => window.location.assign('/')} /></></AuthGate>;
  const view = path === '/old' ? <App /> : path === '/hire' ? lifecycle : publicHome;
  root.render(<React.StrictMode>{view}</React.StrictMode>);
}
