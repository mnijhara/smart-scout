import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import HiringLifecycleV2 from './components/HiringLifecycleV2';
import LandingPageV2 from './components/LandingPageV2';
import AuthGate from './components/AuthGate';
import ByokWidget from './components/ByokWidget';
import './hire-ui.css';

const container = document.getElementById('root');

if (container) {
  const root = createRoot(container);
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  const publicHome = <><LandingPageV2 onUseOwn={() => window.location.assign('/hire')} /><ByokWidget /></>;
  const lifecycle = <AuthGate><HiringLifecycleV2 onBack={() => window.location.assign('/')} /></AuthGate>;

  const view =
    path === '/old' ? <App /> :
    path === '/hire' ? lifecycle :
    publicHome;

  root.render(<React.StrictMode>{view}</React.StrictMode>);
}
