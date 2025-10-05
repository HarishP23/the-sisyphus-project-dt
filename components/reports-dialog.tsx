"use client"

import { useState, useMemo } from "react"
import { BarChart3, Calendar, Flame, Clock, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface Session {
  _id?: string
  taskId: string | null
  projectName: string
  taskName: string | null
  type: "pomodoro" | "short_break" | "long_break"
  startTime: string
  endTime: string
  durationMinutes: number
}

interface ReportsDialogProps {
  sessions: Session[]
}

type TimePeriod = "week" | "month" | "year"

export default function ReportsDialog({ sessions }: ReportsDialogProps) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [detailPage, setDetailPage] = useState(1)
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("year")
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedWeek, setSelectedWeek] = useState(0)
  const itemsPerPage = 10

  const pomodoroSessions = sessions.filter((s) => s.type === "pomodoro")

  // Calculate statistics
  const stats = useMemo(() => {
    const totalMinutes = pomodoroSessions.reduce((sum, s) => sum + s.durationMinutes, 0)
    const totalHours = Math.floor(totalMinutes / 60)

    const uniqueDays = new Set(pomodoroSessions.map((s) => new Date(s.startTime).toDateString()))
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
        for (let i = 1; i < sortedDays.length; i++) {
          const diff = Math.floor((sortedDays[i - 1].getTime() - sortedDays[i].getTime()) / (1000 * 60 * 60 * 24))
          if (diff === 1) {
            currentStreak++
          } else {
            break
          }
        }
      }
    }

    return { totalHours, daysAccessed, currentStreak }
  }, [pomodoroSessions])

  const weeklyData = useMemo(() => {
    const data: { week: string; hours: number; project: string }[] = []
    const projectHours: Record<string, Record<string, number>> = {}

    pomodoroSessions.forEach((session) => {
      const date = new Date(session.startTime)
      if (date.getFullYear() === selectedYear && date.getMonth() === selectedMonth) {
        const weekNum = Math.floor(date.getDate() / 7)
        const weekLabel = `Week ${weekNum + 1}`
        const project = session.projectName || "No Project"

        if (!projectHours[weekLabel]) projectHours[weekLabel] = {}
        if (!projectHours[weekLabel][project]) projectHours[weekLabel][project] = 0

        projectHours[weekLabel][project] += session.durationMinutes / 60
      }
    })

    // Convert to array format for Recharts
    Object.entries(projectHours).forEach(([week, projects]) => {
      Object.entries(projects).forEach(([project, hours]) => {
        data.push({ week, hours: Number(hours.toFixed(2)), project })
      })
    })

    return data
  }, [pomodoroSessions, selectedYear, selectedMonth])

  const monthlyChartData = useMemo(() => {
    const projectHours: Record<string, Record<string, number>> = {}

    pomodoroSessions.forEach((session) => {
      const date = new Date(session.startTime)
      if (date.getFullYear() === selectedYear) {
        const month = date.toLocaleString("en-US", { month: "short" })
        const project = session.projectName || "No Project"

        if (!projectHours[month]) projectHours[month] = {}
        if (!projectHours[month][project]) projectHours[month][project] = 0

        projectHours[month][project] += session.durationMinutes / 60
      }
    })

    // Convert to array format for Recharts
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return months.map((month) => {
      const monthData: Record<string, any> = { month }
      const projects = projectHours[month] || {}
      Object.entries(projects).forEach(([project, hours]) => {
        monthData[project] = Number(hours.toFixed(2))
      })
      return monthData
    })
  }, [pomodoroSessions, selectedYear])

  const yearlyData = useMemo(() => {
    const projectHours: Record<string, Record<string, number>> = {}
    const years = new Set<number>()

    pomodoroSessions.forEach((session) => {
      const date = new Date(session.startTime)
      const year = date.getFullYear().toString()
      years.add(date.getFullYear())
      const project = session.projectName || "No Project"

      if (!projectHours[year]) projectHours[year] = {}
      if (!projectHours[year][project]) projectHours[year][project] = 0

      projectHours[year][project] += session.durationMinutes / 60
    })

    // Convert to array format for Recharts
    return Array.from(years)
      .sort()
      .map((year) => {
        const yearData: Record<string, any> = { year: year.toString() }
        const projects = projectHours[year.toString()] || {}
        Object.entries(projects).forEach(([project, hours]) => {
          yearData[project] = Number(hours.toFixed(2))
        })
        return yearData
      })
  }, [pomodoroSessions])

  // Calculate monthly data
  const monthlyData = useMemo(() => {
    const data: Record<string, Record<string, number>> = {}

    pomodoroSessions.forEach((session) => {
      const date = new Date(session.startTime)
      if (date.getFullYear() === selectedYear) {
        const month = date.toLocaleString("en-US", { month: "short" })
        const project = session.projectName || "No Project"

        if (!data[month]) data[month] = {}
        if (!data[month][project]) data[month][project] = 0

        data[month][project] += session.durationMinutes / 60
      }
    })

    return data
  }, [pomodoroSessions, selectedYear])

  // Get all projects
  const allProjects = useMemo(() => {
    const projects = new Set(pomodoroSessions.map((s) => s.projectName || "No Project"))
    return Array.from(projects).sort()
  }, [pomodoroSessions])

  // Calculate project totals
  const projectTotals = useMemo(() => {
    const totals: Record<string, number> = {}

    pomodoroSessions.forEach((session) => {
      const project = session.projectName || "No Project"
      if (!totals[project]) totals[project] = 0
      totals[project] += session.durationMinutes
    })

    return totals
  }, [pomodoroSessions])

  // Get detail sessions (paginated)
  const detailSessions = useMemo(() => {
    const sorted = [...pomodoroSessions].sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
    )
    const start = (detailPage - 1) * itemsPerPage
    return sorted.slice(start, start + itemsPerPage)
  }, [pomodoroSessions, detailPage])

  const totalPages = Math.ceil(pomodoroSessions.length / itemsPerPage)

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  const getChartData = () => {
    switch (timePeriod) {
      case "week":
        return weeklyData
      case "month":
        return monthlyChartData
      case "year":
        return yearlyData
      default:
        return monthlyChartData
    }
  }

  const getXAxisKey = () => {
    switch (timePeriod) {
      case "week":
        return "week"
      case "month":
        return "month"
      case "year":
        return "year"
      default:
        return "month"
    }
  }

  const projectColors = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ]

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
  }

  const formatTimeRange = (startStr: string, endStr: string) => {
    const start = new Date(startStr)
    const end = new Date(endStr)
    return `${start.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })} - ${end.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}`
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <BarChart3 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reports</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="detail">Detail</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-6 mt-6">
            {/* Activity Summary */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Activity Summary</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-4 border rounded-lg">
                  <Clock className="h-8 w-8 text-orange-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats.totalHours}</p>
                    <p className="text-sm text-muted-foreground">hours focused</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 border rounded-lg">
                  <Calendar className="h-8 w-8 text-orange-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats.daysAccessed}</p>
                    <p className="text-sm text-muted-foreground">days accessed</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 border rounded-lg">
                  <Flame className="h-8 w-8 text-orange-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats.currentStreak}</p>
                    <p className="text-sm text-muted-foreground">day streak</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Focus Hours Chart */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Focus Hours</h3>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 mr-4">
                    <Button
                      variant={timePeriod === "week" ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setTimePeriod("week")}
                    >
                      Week
                    </Button>
                    <Button
                      variant={timePeriod === "month" ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setTimePeriod("month")}
                    >
                      Month
                    </Button>
                    <Button
                      variant={timePeriod === "year" ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setTimePeriod("year")}
                    >
                      Year
                    </Button>
                  </div>
                  {timePeriod === "week" && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (selectedMonth === 0) {
                            setSelectedMonth(11)
                            setSelectedYear(selectedYear - 1)
                          } else {
                            setSelectedMonth(selectedMonth - 1)
                          }
                        }}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm font-medium w-32 text-center">
                        {monthNames[selectedMonth]} {selectedYear}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (selectedMonth === 11) {
                            setSelectedMonth(0)
                            setSelectedYear(selectedYear + 1)
                          } else {
                            setSelectedMonth(selectedMonth + 1)
                          }
                        }}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  {timePeriod === "month" && (
                    <>
                      <Button variant="ghost" size="icon" onClick={() => setSelectedYear(selectedYear - 1)}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm font-medium w-16 text-center">{selectedYear}</span>
                      <Button variant="ghost" size="icon" onClick={() => setSelectedYear(selectedYear + 1)}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <ChartContainer
                  config={allProjects.reduce(
                    (acc, project, index) => ({
                      ...acc,
                      [project]: {
                        label: project,
                        color: projectColors[index % projectColors.length],
                      },
                    }),
                    {},
                  )}
                  className="h-64 w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getChartData()} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey={getXAxisKey()}
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                        tickLine={false}
                        label={{ value: "Hours", angle: -90, position: "insideLeft", style: { fontSize: 12 } }}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      {allProjects.map((project, index) => (
                        <Bar
                          key={project}
                          dataKey={project}
                          stackId="a"
                          fill={projectColors[index % projectColors.length]}
                          radius={index === allProjects.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>

              {/* Project Legend */}
              <div className="mt-4 space-y-2">
                {allProjects.map((project, index) => {
                  const total = projectTotals[project] || 0
                  return (
                    <div key={project} className="flex items-center justify-between py-2 border-b last:border-b-0">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded"
                          style={{ backgroundColor: projectColors[index % projectColors.length] }}
                        />
                        <span className="text-sm">{project}</span>
                      </div>
                      <span className="text-sm font-medium">{formatTime(total)}</span>
                    </div>
                  )
                })}
                <div className="flex items-center justify-between py-2 font-semibold">
                  <span className="text-sm">Total</span>
                  <span className="text-sm">
                    {formatTime(Object.values(projectTotals).reduce((sum, t) => sum + t, 0))}
                  </span>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="detail" className="mt-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Focus Time Detail</h3>

              {/* Detail Table */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr className="border-b">
                      <th className="text-left p-3 text-sm font-medium">DATE</th>
                      <th className="text-left p-3 text-sm font-medium">PROJECT / TASK</th>
                      <th className="text-right p-3 text-sm font-medium">MINUTES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailSessions.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="text-center p-8 text-muted-foreground">
                          No focus sessions yet
                        </td>
                      </tr>
                    ) : (
                      detailSessions.map((session) => (
                        <tr key={session._id} className="border-b last:border-b-0 hover:bg-muted/30">
                          <td className="p-3 text-sm">
                            <div>{formatDate(session.startTime)}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatTimeRange(session.startTime, session.endTime)}
                            </div>
                          </td>
                          <td className="p-3 text-sm">
                            <div className="font-medium">{session.projectName || "No Project"}</div>
                            {session.taskName && (
                              <div className="text-xs text-muted-foreground">{session.taskName}</div>
                            )}
                          </td>
                          <td className="p-3 text-sm text-right font-medium">{session.durationMinutes}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDetailPage((p) => Math.max(1, p - 1))}
                    disabled={detailPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    {detailPage} / {totalPages}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDetailPage((p) => Math.min(totalPages, p + 1))}
                    disabled={detailPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
