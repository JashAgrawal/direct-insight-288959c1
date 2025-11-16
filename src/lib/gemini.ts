// Agent-specific prompts are now in agents.ts
// This function supports both single-agent and multi-agent modes

export async function sendToGemini(
  prompt: string, 
  apiKey: string, 
  systemPrompt?: string
): Promise<string> {
  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: systemPrompt 
          ? [
              {
                parts: [{ text: systemPrompt }],
              },
              {
                parts: [{ text: prompt }],
              },
            ]
          : [
              {
                parts: [{ text: prompt }],
              },
            ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error('Gemini API error');
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}
