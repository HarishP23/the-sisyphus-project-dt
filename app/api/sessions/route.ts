import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { getUserSessions, createSession } from "@/lib/db/sessions"

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const sessions = await getUserSessions(session.user.id)

  return NextResponse.json(sessions)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const sessionData = await request.json()

  const newSession = await createSession({
    userId: session.user.id,
    ...sessionData,
    startTime: new Date(sessionData.startTime),
    endTime: new Date(sessionData.endTime),
  })

  return NextResponse.json(newSession)
}
