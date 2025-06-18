import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { BlogPostContent } from '../types';

// Assume process.env.API_KEY is pre-configured, valid, and accessible.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const textModelName = 'gemini-2.5-flash-preview-04-17';
const imageModelName = 'imagen-3.0-generate-002';

const parseGeminiJsonResponse = (responseText: string): BlogPostContent => {
  let jsonStr = responseText.trim();
  const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
  const match = jsonStr.match(fenceRegex);
  if (match && match[1]) {
    jsonStr = match[1].trim();
  }
  
  try {
    const parsed = JSON.parse(jsonStr);
    if (typeof parsed.title === 'string' && typeof parsed.content === 'string') {
      // imagePrompt is optional
      return parsed as BlogPostContent;
    } else {
      console.error("Parsed JSON does not match BlogPostContent structure:", parsed);
      throw new Error("AI response has an invalid data structure for blog content.");
    }
  } catch (e) {
    console.error("Failed to parse JSON response for blog content:", e, "Raw response text:", responseText);
    throw new Error("Failed to parse AI response for blog content. The response was not valid JSON.");
  }
};

export const generateImage = async (prompt: string): Promise<string | undefined> => {
  if (!prompt) return undefined;

  try {
    console.log(`Generating image with prompt: "${prompt}"`);
    const response = await ai.models.generateImages({
        model: imageModelName,
        prompt: prompt,
        config: { numberOfImages: 1, outputMimeType: 'image/jpeg' },
    });

    if (response.generatedImages && response.generatedImages.length > 0 && response.generatedImages[0].image?.imageBytes) {
      const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
      return `data:image/jpeg;base64,${base64ImageBytes}`;
    }
    console.warn("Image generation did not return image bytes.");
    return undefined;
  } catch (error) {
    console.error("Error generating image:", error);
    if (error instanceof Error && error.message.includes('API key not valid')) {
        throw new Error("Invalid API Key for image generation. Please ensure your Gemini API key is correctly configured.");
    }
    // Don't throw fatal error for image, allow post to proceed without it.
    // Consider logging this to a more robust system in a real app.
    return undefined; 
  }
};

export const generateBlogPostContent = async (topic: string): Promise<BlogPostContent & { imageUrl?: string }> => {
  const prompt = `Generate a compelling blog post about \"${topic}\". The post should have a captivating title, well-structured content (around 250-400 words), and a concise, descriptive prompt for an image that would visually represent the blog post. Format the response as a JSON object with three keys: "title" (string), "content" (string), and "imagePrompt" (string for generating an image). For example: {"title": "The Future of Renewable Energy", "content": "Renewable energy is rapidly transforming our world...", "imagePrompt": "Futuristic cityscape powered by solar panels and wind turbines under a clear blue sky"}`;

  try {
    const contentResponse = await ai.models.generateContent({
      model: textModelName,
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        temperature: 0.7,
      }
    });
    
    const blogContent = parseGeminiJsonResponse(contentResponse.text);
    let imageUrl: string | undefined = undefined;

    if (blogContent.imagePrompt) {
      imageUrl = await generateImage(blogContent.imagePrompt);
    } else {
      console.warn("No imagePrompt provided by the text generation model.");
    }
    
    return { ...blogContent, imageUrl };

  } catch (error) {
    console.error("Error generating blog post content or image:", error);
    if (error instanceof Error && error.message.includes('API key not valid')) {
        throw new Error("Invalid API Key. Please ensure your Gemini API key is correctly configured.");
    }
    if (error instanceof Error) {
        throw new Error(`Gemini API error: ${error.message}`);
    }
    throw new Error("An unknown error occurred while generating blog post content.");
  }
};

export const generateInitialWelcomePost = async (): Promise<BlogPostContent> => {
  // Welcome post will not have an image generated for simplicity
  const topic = "the joy of writing and sharing ideas online";
  const prompt = `Generate a short, welcoming blog post about \"${topic}\". The post should have a friendly title and around 100-150 words of engaging content. Format the response as a JSON object with two keys: "title" (string) and "content" (string). Example: {"title": "Welcome to Your New Blog!", "content": "Sharing your thoughts online can be an incredibly rewarding experience. This space is yours to fill with ideas, stories, and insights. Happy writing!"}`;
  
  try {
    const response = await ai.models.generateContent({
      model: textModelName,
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        temperature: 0.6,
      }
    });
    return parseGeminiJsonResponse(response.text);
  } catch (error) {
    console.error("Error generating initial welcome post:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to generate welcome post: ${error.message}`);
    }
    throw new Error("An unknown error occurred while generating the welcome post.");
  }
};