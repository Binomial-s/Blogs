export interface BlogPost {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  date: string;
  imageUrl?: string; // Optional: URL of the post's image
}

export interface BlogPostContent { // For Gemini response parsing
  title: string;
  content: string;
  imagePrompt?: string; // Optional: A prompt for generating an image related to the post
  // suggestedImageUrl?: string; // Optional: Gemini might suggest a stock image URL
}

export interface GroundingChunkWeb {
  uri: string;
  title: string;
}

export interface GroundingChunk {
  web: GroundingChunkWeb;
}