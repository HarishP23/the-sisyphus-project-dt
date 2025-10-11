import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export interface Task {
  _id?: ObjectId
  userId: string
  projectName: string
  title: string
  notes: string
  estPomodoros: number
  actPomodoros: number
  isCompleted: boolean
  createdAt: Date
}

export async function getUserTasks(userId: string): Promise<Task[]> {
  const client = await clientPromise
  const db = client.db("pomodoro")
  const tasks = await db.collection<Task>("tasks").find({ userId }).sort({ createdAt: -1 }).toArray()
  return tasks
}

export async function createTask(taskData: Omit<Task, "_id" | "createdAt">): Promise<Task> {
  const client = await clientPromise
  const db = client.db("pomodoro")

  const task: Omit<Task, "_id"> = {
    ...taskData,
    createdAt: new Date(),
  }

  const result = await db.collection<Task>("tasks").insertOne(task as any)
  return { ...task, _id: result.insertedId }
}

export async function updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
  const client = await clientPromise
  const db = client.db("pomodoro")

  // Strip immutable and server-managed fields before $set
  const { _id, ...safeUpdates } = (updates || {}) as any

  await db.collection<Task>("tasks").updateOne({ _id: new ObjectId(taskId) }, { $set: safeUpdates })
}

export async function deleteTask(taskId: string): Promise<void> {
  const client = await clientPromise
  const db = client.db("pomodoro")

  await db.collection<Task>("tasks").deleteOne({ _id: new ObjectId(taskId) })
}

export async function getUserProjects(userId: string): Promise<string[]> {
  const client = await clientPromise
  const db = client.db("pomodoro")

  const projects = await db.collection<Task>("tasks").distinct("projectName", { userId })

  return projects.filter((p) => p && p !== "No Project").sort()
}
