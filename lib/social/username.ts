/** Strip @ and invalid chars; used while typing and before save. */
export function sanitizeUsernameInput(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 30)
}

export function normalizeUsername(value: string): string {
  return sanitizeUsernameInput(value)
}

export function isValidUsername(username: string): boolean {
  return /^[a-z0-9_-]{3,30}$/.test(username)
}

export const USERNAME_HINT =
  '3–30 characters: letters, numbers, underscores, and hyphens'
