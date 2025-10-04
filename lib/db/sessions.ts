import clientPromise from "@/lib/mongodb"
import type { ObjectId } from "mongodb"

export interface Session {
  _id?: ObjectId
  userId: string
  taskId: string | null
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
