import React from 'react';
import MagicHiringDemoReal from './MagicHiringDemoReal';

export default function MagicHiringDemoV3({onUseOwn}:{onUseOwn:()=>void}){
  return <MagicHiringDemoReal onUseOwn={onUseOwn}/>;
}
