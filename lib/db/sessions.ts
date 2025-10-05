import clientPromise from "@/lib/mongodb"
import type { ObjectId } from "mongodb"

export interface Session {
  _id?: ObjectId
  userId: string
  taskId: string | null
  projectName: string
  taskName: string | null
  type: "pomodoro" | "short_break" | "long_break"
  startTime: Date
  endTime: Date
  durationMinutes: number
}

export async function getUserSessions(userId: string): Promise<Session[]> {
  const client = await clientPromise
  const db = client.db("pomodoro")
  const sessions = await db.collection<Session>("sessions").find({ userId }).sort({ startTime: -1 }).toArray()
  return sessions
}

export async function createSession(sessionData: Omit<Session, "_id">): Promise<Session> {
  const client = await clientPromise
  const db = client.db("pomodoro")

  const result = await db.collection<Session>("sessions").insertOne(sessionData as any)
  return { ...sessionData, _id: result.insertedId }
}

export async function getUserStats(userId: string): Promise<{ pomodorosCompleted: number }> {
  const client = await clientPromise
  const db = client.db("pomodoro")

  const pomodorosCompleted = await db.collection<Session>("sessions").countDocuments({ userId, type: "pomodoro" })

  return { pomodorosCompleted }
}

export interface SessionStats {
  totalMinutes: number
  daysAccessed: number
  currentStreak: number
  sessions: Session[]
}

export async function getUserSessionStats(userId: string): Promise<SessionStats> {
  const client = await clientPromise
  const db = client.db("pomodoro")

  const sessions = await db
    .collection<Session>("sessions")
    .find({ userId, type: "pomodoro" })
    .sort({ startTime: -1 })
    .toArray()

  const totalMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0)

  // Calculate days accessed
  const uniqueDays = new Set(sessions.map((s) => new Date(s.startTime).toDateString()))
  const daysAccessed = uniqueDays.size

  // Calculate current streak
  let currentStreak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const sortedDays = Array.from(uniqueDays)
    .map((d) => new Date(d))
    .sort((a, b) => b.getTime() - a.getTime())

  if (sortedDays.length > 0) {
    const mostRecentDay = sortedDays[0]
    const daysDiff = Math.floor((today.getTime() - mostRecentDay.getTime()) / (1000 * 60 * 60 * 24))

    if (daysDiff <= 1) {
      currentStreak = 1
      const checkDate = new Date(mostRecentDay)
      checkDate.setDate(checkDate.getDate() - 1)

      for (let i = 1; i < sortedDays.length; i++) {
        const dayDiff = Math.floor((sortedDays[i - 1].getTime() - sortedDays[i].getTime()) / (1000 * 60 * 60 * 24))
        if (dayDiff === 1) {
          currentStreak++
        } else {
          break
        }
      }
    }
  }

  return {
    totalMinutes,
    daysAccessed,
    currentStreak,
    sessions,
  }
}
