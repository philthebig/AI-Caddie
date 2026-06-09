'use client'

import { useCompletion } from '@ai-sdk/react'; 
import { useRouter } from 'next/navigation';

export default function AICoachButton({ roundId }: { roundId: string }) {
  const router = useRouter();

  // The Vercel AI SDK Hook
  const { complete, completion, isLoading, error } = useCompletion({
    api: '/api/coach',
    // Must match the API's toTextStreamResponse() — default is data stream protocol
    streamProtocol: 'text',
    onFinish: () => {
      // Refresh after DB save in the API route's onFinish has time to complete
      setTimeout(() => router.refresh(), 500);
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

  if (error) {
    return (
      <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-800">
          Failed to generate feedback. Please try again.
        </p>
        <button
          onClick={handleClick}
          className="mt-2 text-sm font-medium text-red-700 underline"
        >
          Retry
        </button>
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