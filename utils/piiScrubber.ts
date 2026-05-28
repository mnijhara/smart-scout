/**
 * Enhanced client-side PII scrubber.
 * Masks emails, phone numbers, and basic name patterns.
 */
export const scrubPII = (text: string): string => {
    // Basic email regex
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    // Basic phone number regex (simplified)
    const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    // Basic name pattern (e.g., "My name is John Doe")
    const nameRegex = /(?:my name is|i am)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/gi;
    
    return text
        .replace(emailRegex, "[EMAIL_MASKED]")
        .replace(phoneRegex, "[PHONE_MASKED]")
        .replace(nameRegex, (match, p1) => match.replace(p1, "[NAME_MASKED]"));
};
