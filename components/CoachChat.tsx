'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { useMemo, useRef, useState } from 'react'
import { SUGGESTED_COACH_PROMPTS } from '@/lib/coach/messages'

type CoachChatProps = {
  roundId: string
  initialMessages?: UIMessage[]
}

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter(
      (p): p is { type: 'text' | 'reasoning'; text: string } =>
        (p.type === 'text' || p.type === 'reasoning') && 'text' in p && Boolean(p.text)
    )
    .map((p) => p.text)
    .join('')
}

export default function CoachChat({ roundId, initialMessages = [] }: CoachChatProps) {
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/coach/chat',
        body: { roundId },
      }),
    [roundId]
  )

  const { messages, sendMessage, status, error } = useChat({
    transport,
    messages: initialMessages,
  })

  const isLoading = status === 'streaming' || status === 'submitted'

  const handleSend = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || isLoading) return
    setInput('')
    void sendMessage({ text: trimmed })
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    })
  }

  const showSuggestions = messages.length === initialMessages.length && !isLoading
  const showThread = messages.length > 0 || isLoading

  return (
    <div className="space-y-3">
      {showThread && (
        <div
          ref={scrollRef}
          className="max-h-80 overflow-y-auto space-y-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3"
        >
          {messages.map((message) => {
            const text = getMessageText(message)
            const isUser = message.role === 'user'
            if (!text && isUser) return null

            return (
              <div
                key={message.id}
                className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    isUser
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white border border-indigo-100 text-indigo-900'
                  }`}
                >
                  {text || (isLoading && !isUser ? '…' : null)}
                </div>
              </div>
            )
          })}
          {isLoading && (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-indigo-100 bg-white px-3.5 py-2.5 text-sm text-indigo-500">
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
                  Thinking…
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {showSuggestions && (
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_COACH_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => handleSend(prompt)}
              className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-800 hover:bg-indigo-100 touch-manipulation transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-700">
          {error.message.includes('429') || error.message.toLowerCase().includes('limit')
            ? 'Message limit reached. Try again tomorrow or on your next round.'
            : 'Something went wrong. Please try again.'}
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSend(input)
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask your caddie a follow-up…"
          disabled={isLoading}
          className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="shrink-0 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50 touch-manipulation transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  )
}
