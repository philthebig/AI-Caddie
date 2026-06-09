import { GolfCourseApiError, searchCourses } from '@/lib/golf-course-api/client'
import { formatCourseLabel } from '@/lib/types/course'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') ?? ''

  if (query.trim().length < 2) {
    return NextResponse.json({ courses: [] })
  }

  try {
    const courses = await searchCourses(query)
    return NextResponse.json({
      courses: courses.map((course) => ({
        id: course.id,
        label: formatCourseLabel(course),
        clubName: course.club_name,
        courseName: course.course_name,
        city: course.location?.city ?? null,
        state: course.location?.state ?? null,
      })),
    })
  } catch (error) {
    if (error instanceof GolfCourseApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status ?? 500 })
    }
    return NextResponse.json({ error: 'Failed to search courses' }, { status: 500 })
  }
}
