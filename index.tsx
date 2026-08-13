import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import JobIntelligence from './components/JobIntelligence';

const container=document.getElementById('root');
if(container){const root=createRoot(container);const path=window.location.pathname.replace(/\/$/,'')||'/';root.render(<React.StrictMode>{path==='/old'?<App/>:<JobIntelligence/>}</React.StrictMode>);}
