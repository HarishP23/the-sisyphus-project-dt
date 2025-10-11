import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { updateTask, deleteTask } from "@/lib/db/tasks"

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { params } = await context
  const { id } = params

  const updates = await request.json()
  // Remove immutable/id fields if present from client payload
  if (updates && typeof updates === "object") {
    delete updates._id
  }

  await updateTask(id, updates)
  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { params } = await context
  const { id } = params

  await deleteTask(id)
  return NextResponse.json({ success: true })
}
