import clientPromise from "@/lib/mongodb"
import type { ObjectId } from "mongodb"

export interface User {
  _id?: ObjectId
  email: string
  name: string
  image?: string
  createdAt: Date
  settings: {
    pomodoroTime: number
    shortBreakTime: number
    longBreakTime: number
    longBreakInterval: number
    autoStartBreaks: boolean
    autoStartPomodoros: boolean
    theme: "light" | "dark"
    pomodoroColor: string
    shortBreakColor: string
    longBreakColor: string
    alarmSound: string
    backgroundSound: string
    alarmVolume: number
    backgroundVolume: number
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const client = await clientPromise
  const db = client.db("pomodoro")
  const user = await db.collection<User>("users").findOne({ email })
  return user
}

export async function createUser(userData: Omit<User, "_id" | "createdAt">): Promise<User> {
  const client = await clientPromise
  const db = client.db("pomodoro")

  const user: Omit<User, "_id"> = {
    ...userData,
    createdAt: new Date(),
  }

  const result = await db.collection<User>("users").insertOne(user as any)
  return { ...user, _id: result.insertedId }
}

export async function updateUserSettings(email: string, settings: User["settings"]): Promise<void> {
  const client = await clientPromise
  const db = client.db("pomodoro")

  await db.collection<User>("users").updateOne({ email }, { $set: { settings } })
}
