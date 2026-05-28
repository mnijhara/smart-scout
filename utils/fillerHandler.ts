/**
 * Simple client-side filler word remover.
 */
export const removeFillerWords = (text: string): string => {
    const fillers = [
        /\bum\b/gi,
        /\buh\b/gi,
        /\buhm\b/gi,
        /\buh-huh\b/gi,
        /\bmm-hmm\b/gi,
        /\byou know\b/gi,
        /\blike\b/gi,
        /\bactually\b/gi,
        /\bbasically\b/gi,
        /\bso\b/gi,
        /\bwell\b/gi
    ];
    
    let cleaned = text;
    fillers.forEach(filler => {
        cleaned = cleaned.replace(filler, "");
    });
    
    // Clean up extra spaces
    return cleaned.replace(/\s+/g, ' ').trim();
};
