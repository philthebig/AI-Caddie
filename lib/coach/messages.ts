import type { CoachMessage } from '@prisma/client'
import type { UIMessage } from 'ai'

export function coachMessagesToUIMessages(messages: CoachMessage[]): UIMessage[] {
  return messages.map((msg) => ({
    id: msg.id,
    role: msg.role === 'USER' ? 'user' : 'assistant',
    parts: [{ type: 'text' as const, text: msg.content }],
  }))
}

export const SUGGESTED_COACH_PROMPTS = [
  'Why did I struggle on the back nine?',
  'What should I work on at the range this week?',
  'Which holes cost me the most strokes today?',
  'Give me a 30-minute practice plan based on this round.',
] as const
