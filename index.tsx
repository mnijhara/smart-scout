import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import HiringLifecycleV2 from './components/HiringLifecycleV2';
import LandingPage from './components/LandingPage';
import AuthGate from './components/AuthGate';
import './hire-ui.css';

const container = document.getElementById('root');

if (container) {
  const root = createRoot(container);
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  const lifecycle = <AuthGate><HiringLifecycleV2 onBack={() => window.location.assign('/home')} /></AuthGate>;

  const view =
    path === '/old' ? <App /> :
    path === '/home' ? <LandingPage onUseOwn={() => window.location.assign('/')} /> :
    lifecycle;

  root.render(<React.StrictMode>{view}</React.StrictMode>);
}
