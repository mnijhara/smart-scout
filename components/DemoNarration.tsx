import React, { useState, useEffect } from 'react';

interface DemoNarrationProps {
  text: string;
}

const DemoNarration: React.FC<DemoNarrationProps> = ({ text }) => {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    if (!text) {
      setDisplayedText('');
      return;
    }

    setDisplayedText('');
    let index = 0;
    
    const intervalId = setInterval(() => {
      index++;
      setDisplayedText(text.substring(0, index));
      
      if (index >= text.length) {
        clearInterval(intervalId);
      }
    }, 8); // Ultra-fast typewriter

    return () => {
      clearInterval(intervalId);
    };
  }, [text]);

  if (!text) return null;

  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[120] w-[90%] max-w-2xl">
      <div className="bg-indigo-950/90 backdrop-blur-xl border border-indigo-400/30 rounded-2xl shadow-2xl p-5 flex items-center gap-4 animate-slideUp">
        <div className="shrink-0 w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/40">
            <div className="w-2.5 h-2.5 bg-white rounded-full animate-ping"></div>
        </div>
        <p className="text-sm text-indigo-100 font-semibold leading-relaxed italic">"{displayedText}"</p>
      </div>
    </div>
  );
};

export default DemoNarration;