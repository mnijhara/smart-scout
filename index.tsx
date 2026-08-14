import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import HiringLifecycleConnected from './components/HiringLifecycleConnected';
import LandingPage from './components/LandingPage';
const container=document.getElementById('root');
if(container){const root=createRoot(container);const path=window.location.pathname.replace(/\/$/,'')||'/';const view=path==='/old'?<App/>:path==='/hire'?<HiringLifecycleConnected onBack={()=>window.location.assign('/')}/>:<LandingPage onUseOwn={()=>window.location.assign('/hire')}/>;root.render(<React.StrictMode>{view}</React.StrictMode>)}
