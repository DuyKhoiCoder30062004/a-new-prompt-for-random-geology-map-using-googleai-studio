import { GoogleGenAI, Modality, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface Message {
  role: "user" | "model";
  content: string;
  groundingChunks?: any[];
}

export async function sendMessage(
  prompt: string,
  history: Message[],
  location?: { latitude: number; longitude: number }
) {
  try {
    const model = "gemini-2.5-flash";
    
    const contents = history.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }]
    }));
    
    contents.push({
      role: "user",
      parts: [{ text: prompt }]
    });

    const config: any = {
      tools: [{ googleMaps: {} }, { googleSearch: {} }],
    };

    if (location) {
      config.toolConfig = {
        retrievalConfig: {
          latLng: {
            latitude: location.latitude,
            longitude: location.longitude
          }
        }
      };
    }

    const response = await ai.models.generateContent({
      model,
      contents,
      config,
    });

    return {
      text: response.text || "I couldn't find an answer for that.",
      groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}
