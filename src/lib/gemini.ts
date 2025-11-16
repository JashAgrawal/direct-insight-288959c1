// Agent-specific prompts are now in agents.ts
// This function supports both single-agent and multi-agent modes

import { GoogleGenerativeAI } from '@google/generative-ai';

// Get API key from environment variable
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.warn('VITE_GEMINI_API_KEY not found in environment variables');
}

// Initialize Gemini client
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

export async function sendToGemini(
  prompt: string, 
  systemPrompt?: string
): Promise<string> {
  if (!genAI) {
    throw new Error('Gemini API key not configured. Please set VITE_GEMINI_API_KEY environment variable.');
  }

  try {
    // Use gemini-2.0-flash-exp or fallback to gemini-1.5-flash
    const modelConfig: any = {
      model: 'gemini-2.5-flash',
    };
    
    // Use system instruction if system prompt is provided
    if (systemPrompt) {
      modelConfig.systemInstruction = {
        parts: [{ text: systemPrompt }],
      };
    }
    
    const model = genAI.getGenerativeModel(modelConfig);
    
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.5,
        // maxOutputTokens: 500,
      },
    });

    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini API error:', error);
    // If gemini-2.0-flash-exp fails, try gemini-1.5-flash
    if (error instanceof Error && error.message.includes('gemini-2.0-flash-exp')) {
      try {
        const modelConfig: any = {
          model: 'gemini-2.5-flash',
        };
        if (systemPrompt) {
          modelConfig.systemInstruction = {
            parts: [{ text: systemPrompt }],
          };
        }
        const model = genAI.getGenerativeModel(modelConfig);
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.5,
            // maxOutputTokens: 500,
          },
        });
        const response = result.response;
        const txt= response.text().toString();
        // if (txt.includes('```')) {
        //   return txt.replace('```', '').replace('```', '').replace('json', '');
        // }
        return txt
      } catch (fallbackError) {
        console.error('Fallback model also failed:', fallbackError);
        throw new Error(`Gemini API error: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`);
      }
    }
    throw new Error(`Gemini API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
