import { GolfCourseApiError, getCourseById } from '@/lib/golf-course-api/client'
import { formatCourseLabel, getTeeOptions } from '@/lib/types/course'
import { NextResponse } from 'next/server'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params
  const courseId = Number(id)

  if (!Number.isInteger(courseId) || courseId <= 0) {
    return NextResponse.json({ error: 'Invalid course id' }, { status: 400 })
  }

  try {
    const course = await getCourseById(courseId)
    const tees = getTeeOptions(course)

    return NextResponse.json({
      id: course.id,
      label: formatCourseLabel(course),
      clubName: course.club_name,
      courseName: course.course_name,
      city: course.location?.city ?? null,
      state: course.location?.state ?? null,
      latitude: course.location?.latitude ?? null,
      longitude: course.location?.longitude ?? null,
      tees: tees.map((tee) => ({
        name: tee.tee_name,
        totalYards: tee.total_yards ?? null,
        parTotal: tee.par_total ?? null,
        courseRating: tee.course_rating ?? null,
        slopeRating: tee.slope_rating ?? null,
        holeCount: tee.holes.length,
        holes: tee.holes.map((hole, index) => ({
          holeNumber: hole.hole_number ?? hole.par_number ?? index + 1,
          par: hole.par,
          yardage: hole.yardage,
          handicap: hole.handicap ?? null,
        })),
      })),
    })
  } catch (error) {
    if (error instanceof GolfCourseApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status ?? 500 })
    }
    return NextResponse.json({ error: 'Failed to load course' }, { status: 500 })
  }
}
