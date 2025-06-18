import React, { useState, useEffect, useCallback } from 'react';
import { BlogPost } from './types';
import { generateBlogPostContent, generateInitialWelcomePost } from './services/geminiService';
import { Navbar } from './components/Navbar';
import { BlogPostCard } from './components/BlogPostCard';
import { BlogPostView } from './components/BlogPostView';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorMessage } from './components/ErrorMessage';
import { PlusIcon, ImagePlaceholderIcon } from './components/icons'; // Added ImagePlaceholderIcon

const App: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false); // For initial welcome post
  const [error, setError] = useState<string | null>(null);
  const [topic, setTopic] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false); // For user-triggered post generation

  const loadInitialPost = useCallback(async () => {
    if (posts.length === 0 && process.env.API_KEY) { // Check for API_KEY before attempting
      setIsLoading(true);
      setError(null);
      try {
        const data = await generateInitialWelcomePost(); // This function does not return imageUrl
        const newPost: BlogPost = {
          id: `initial-${Date.now()}`,
          title: data.title,
          content: data.content,
          excerpt: data.content.substring(0, 150) + "...",
          date: new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }),
          // No imageUrl for the initial welcome post by design
        };
        setPosts([newPost]);
      } catch (err) {
        console.error("Failed to load initial post:", err);
        // Do not set a global error for this, user can generate their own.
      } finally {
        setIsLoading(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // posts.length removed from deps as it's checked inside

  useEffect(() => {
    loadInitialPost();
  }, [loadInitialPost]);

  const handleGeneratePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || isGenerating) return;

    setIsGenerating(true);
    setError(null);
    try {
      const data = await generateBlogPostContent(topic); // This now returns imageUrl
      const newPost: BlogPost = {
        id: Date.now().toString(),
        title: data.title,
        content: data.content,
        excerpt: data.content.substring(0, 150) + "...",
        date: new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }),
        imageUrl: data.imageUrl, // Store the generated image URL
      };
      setPosts(prevPosts => [newPost, ...prevPosts]);
      setTopic(''); 
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred while generating the post.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectPost = (post: BlogPost) => {
    setSelectedPost(post);
  };

  const handleGoBackToList = () => {
    setSelectedPost(null);
  };

  if (isLoading && posts.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 p-4">
        <LoadingSpinner />
        <p className="text-slate-600 mt-4">Crafting a welcome post for you...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <Navbar />
      <main className="container mx-auto p-4 md:p-8">
        {selectedPost ? (
          <BlogPostView post={selectedPost} onBack={handleGoBackToList} />
        ) : (
          <>
            <form onSubmit={handleGeneratePost} className="mb-8 p-6 bg-white rounded-xl shadow-lg transition-all hover:shadow-xl">
              <h2 className="text-2xl font-semibold text-slate-700 mb-4">Create a New Post</h2>
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Enter a topic (e.g., 'The Future of AI')"
                  className="flex-grow p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-shadow"
                  disabled={isGenerating}
                  aria-label="Blog post topic"
                />
                <button
                  type="submit"
                  disabled={isGenerating || !topic.trim()}
                  className="flex items-center justify-center px-6 py-3 bg-sky-600 text-white font-medium rounded-lg shadow-md hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-opacity-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-live="polite"
                >
                  {isGenerating ? <LoadingSpinner size="sm" /> : <PlusIcon className="w-5 h-5 mr-2" />}
                  {isGenerating ? 'Generating Post & Image...' : 'Generate Post'}
                </button>
              </div>
            </form>

            {error && !isGenerating && <ErrorMessage message={error} onClose={() => setError(null)} />}
            
            {posts.length === 0 && !isLoading && !error && (
              <div className="text-center py-10 bg-white rounded-xl shadow-md p-6">
                 <div className="w-32 h-32 mx-auto text-slate-300 flex items-center justify-center">
                    <ImagePlaceholderIcon className="w-24 h-24" />
                 </div>
                <h3 className="text-2xl font-semibold text-slate-600 mt-4 mb-2">Your Blog Awaits!</h3>
                <p className="text-slate-500">Looks like there are no posts yet. Why not generate one using the form above?</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map(post => (
                <BlogPostCard key={post.id} post={post} onSelect={handleSelectPost} />
              ))}
            </div>
          </>
        )}
      </main>
      <footer className="text-center py-8 text-slate-500 border-t border-slate-200 mt-12">
        <p>&copy; {new Date().getFullYear()} Gemini Blog Weaver. Powered by AI.</p>
      </footer>
    </div>
  );
};

export default App;