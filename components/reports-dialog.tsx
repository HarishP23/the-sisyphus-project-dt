"use client"

import { BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

interface Session {
  id: string
  taskId: string | null
  type: "pomodoro" | "short_break" | "long_break"
  startTime: string
  endTime: string
  durationMinutes: number
}

interface ReportsDialogProps {
  sessions: Session[]
}

export default function ReportsDialog({ sessions }: ReportsDialogProps) {
  const calculateStats = (period: "day" | "week" | "month") => {
    const now = new Date()
    const startDate = new Date()

    if (period === "day") {
      startDate.setHours(0, 0, 0, 0)
    } else if (period === "week") {
      startDate.setDate(now.getDate() - 7)
    } else {
      startDate.setMonth(now.getMonth() - 1)
    }

    const filteredSessions = sessions.filter((s) => {
      const sessionDate = new Date(s.startTime)
      return sessionDate >= startDate && s.type === "pomodoro"
    })

    const totalMinutes = filteredSessions.reduce((sum, s) => sum + s.durationMinutes, 0)
    const totalHours = (totalMinutes / 60).toFixed(1)
    const totalSessions = filteredSessions.length

    return { totalHours, totalSessions, sessions: filteredSessions }
  }

  const exportCSV = () => {
    const csv = [
      ["Date", "Start Time", "End Time", "Duration (min)", "Type"],
      ...sessions.map((s) => [
        new Date(s.startTime).toLocaleDateString(),
        new Date(s.startTime).toLocaleTimeString(),
        new Date(s.endTime).toLocaleTimeString(),
        s.durationMinutes.toString(),
        s.type,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `pomodoro-sessions-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const SimpleBarChart = ({ data, maxValue }: { data: number; maxValue: number }) => {
    const percentage = maxValue > 0 ? (data / maxValue) * 100 : 0
    return (
      <div className="w-full h-32 flex items-end">
        <div className="w-full bg-orange-500 rounded-t" style={{ height: `${percentage}%` }} />
      </div>
    )
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <BarChart3 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Focus Time Reports</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="day" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="day">Today</TabsTrigger>
            <TabsTrigger value="week">This Week</TabsTrigger>
            <TabsTrigger value="month">This Month</TabsTrigger>
          </TabsList>

          {(["day", "week", "month"] as const).map((period) => {
            const stats = calculateStats(period)
            const maxSessions = Math.max(10, stats.totalSessions)

            return (
              <TabsContent key={period} value={period} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Focus Time</p>
                    <p className="text-3xl font-bold">{stats.totalHours}h</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Sessions</p>
                    <p className="text-3xl font-bold">{stats.totalSessions}</p>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <p className="text-sm font-medium mb-4">Focus Sessions</p>
                  <SimpleBarChart data={stats.totalSessions} maxValue={maxSessions} />
                  <p className="text-center text-sm text-gray-500 mt-2">{stats.totalSessions} sessions completed</p>
                </div>
              </TabsContent>
            )
          })}
        </Tabs>

        <Button onClick={exportCSV} variant="outline" className="w-full bg-transparent">
          Export as CSV
        </Button>
      </DialogContent>
    </Dialog>
  )
}
