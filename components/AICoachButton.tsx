'use client'

import { useCompletion } from '@ai-sdk/react'; 
import { useRouter } from 'next/navigation';

export default function AICoachButton({ roundId }: { roundId: string }) {
  const router = useRouter();

  // The Vercel AI SDK Hook
  const { complete, completion, isLoading } = useCompletion({
    api: '/api/coach', // Points to our new route
    onFinish: () => {
      // When the stream is totally done, refresh the page data
      // so the new advice is permanently shown from the database.
      router.refresh(); 
    },
  });

  // Function to start the stream
  const handleClick = async () => {
    await complete('', { body: { roundId } });
  };

  // If we have any completion text (even if still loading), show it!
  if (completion || isLoading) {
    return (
      <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-lg">
        <h4 className="font-bold text-indigo-900 text-sm mb-1 flex items-center gap-2">
          {isLoading ? '🤖 AI Caddie is typing...' : '🤖 AI Caddie Analysis'}
        </h4>
        <p className="text-indigo-800 text-sm leading-relaxed animate-pulse-text">
          {completion}
        </p>
      </div>
    );
  }

  return (
    <button 
      onClick={handleClick}
      disabled={isLoading}
      className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors flex justify-center items-center gap-2"
    >
      Get AI Coach Feedback ✨
    </button>
  );
}