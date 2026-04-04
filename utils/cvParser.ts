// CV Parser Utility

/**
 * Enhanced CV Parser with multiple email extraction patterns:
 * - Standard email
 * - Gmail patterns
 * - Space-separated formats
 * - Pipe-separated formats
 *
 * Phone number extraction:
 * - International formats
 * - US formats
 *
 * Name extraction
 * Location extraction
 * LinkedIn URL extraction
 *
 * Gemini-powered AI fallback function extractContactDetailsWithAI
 * that only runs if email not found locally.
 */

function extractContactDetailsWithAI(cvText) {
    // Implementation for AI-based extraction
}

function debugParsing(details) {
    console.log("Debug Info:", details);
}

// Additional functions for extracting emails, phone numbers, names...