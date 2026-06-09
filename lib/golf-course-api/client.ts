import {
  courseDetailResponseSchema,
  courseSearchResponseSchema,
  type CourseDetail,
  type CourseSearchResult,
} from '@/lib/types/course'

const API_BASE = 'https://api.golfcourseapi.com'

export class GolfCourseApiError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message)
    this.name = 'GolfCourseApiError'
  }
}

function getApiKey() {
  const key = process.env.GOLF_COURSE_API_KEY
  if (!key?.trim()) {
    throw new GolfCourseApiError(
      'Golf course search is not configured. Add GOLF_COURSE_API_KEY to your environment.',
      503
    )
  }
  return key.trim()
}

async function golfCourseFetch<T>(path: string, params?: Record<string, string>) {
  const url = new URL(`${API_BASE}${path}`)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value)
    }
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Key ${getApiKey()}`,
      Accept: 'application/json',
    },
    next: { revalidate: 60 * 60 },
  })

  if (response.status === 401) {
    throw new GolfCourseApiError('Invalid golf course API key', 401)
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new GolfCourseApiError(
      body || `Golf course API request failed (${response.status})`,
      response.status
    )
  }

  return response.json() as Promise<T>
}

export async function searchCourses(query: string): Promise<CourseSearchResult[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2) {
    return []
  }

  const data = await golfCourseFetch<unknown>('/v1/search', { search_query: trimmed })
  const parsed = courseSearchResponseSchema.safeParse(data)

  if (!parsed.success) {
    throw new GolfCourseApiError('Unexpected response from golf course API', 502)
  }

  return parsed.data.courses
}

export async function getCourseById(id: number): Promise<CourseDetail> {
  const data = await golfCourseFetch<unknown>(`/v1/courses/${id}`)
  const parsed = courseDetailResponseSchema.safeParse(data)

  if (!parsed.success) {
    throw new GolfCourseApiError('Unexpected course detail response from golf course API', 502)
  }

  return 'course' in parsed.data ? parsed.data.course : parsed.data
}

export function isGolfCourseApiConfigured() {
  return Boolean(process.env.GOLF_COURSE_API_KEY?.trim())
}
