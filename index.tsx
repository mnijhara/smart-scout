import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import JobIntelligence from './components/JobIntelligence';
import LandingPage from './components/LandingPage';

const container=document.getElementById('root');
if(container){
  const root=createRoot(container);
  const path=window.location.pathname.replace(/\/$/,'')||'/';
  const view=path==='/old'?<App/>:path==='/hire'?<JobIntelligence/>:<LandingPage onUseOwn={()=>{window.location.assign('/hire')}}/>;
  root.render(<React.StrictMode>{view}</React.StrictMode>);
}
