import { GoogleGenAI } from "@google/genai";

/**
 * Initialize the Gemini API client
 * Note: In a real app, ensure process.env.API_KEY is defined.
 */
export const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

/**
 * Check if API key is available
 */
export const hasApiKey = (): boolean => {
  return Boolean(process.env.API_KEY);
};

