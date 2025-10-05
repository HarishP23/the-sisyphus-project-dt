"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import {
  LucideSettings,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  Edit2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import FlipClock from "@/components/flip-clock"
import ReportsDialog from "@/components/reports-dialog"
import AuthButton from "@/components/auth-button"

type TimerMode = "pomodoro" | "short_break" | "long_break"

interface Task {
  _id?: string
  projectName: string
  title: string
  notes: string
  estPomodoros: number
  actPomodoros: number
  isCompleted: boolean
  createdAt: string
}

interface TimerSettings {
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

interface Session {
  _id?: string
  taskId: string | null
  projectName: string
  taskName: string | null
  type: TimerMode
  startTime: string
  endTime: string
  durationMinutes: number
}

const ALARM_SOUNDS = [
  { value: "bell", label: "Bell" },
  { value: "chime", label: "Chime" },
  { value: "digital", label: "Digital" },
  { value: "gentle", label: "Gentle" },
]

const BACKGROUND_SOUNDS = [
  { value: "none", label: "None" },
  { value: "rain", label: "Rain" },
  { value: "cafe", label: "Cafe" },
  { value: "fireplace", label: "Fireplace" },
  { value: "forest", label: "Forest" },
]

const DEFAULT_SETTINGS: TimerSettings = {
  pomodoroTime: 25,
  shortBreakTime: 5,
  longBreakTime: 15,
  longBreakInterval: 4,
  autoStartBreaks: false,
  autoStartPomodoros: false,
  theme: "light",
  pomodoroColor: "#f97316",
  shortBreakColor: "#06b6d4",
  longBreakColor: "#8b5cf6",
  alarmSound: "bell",
  backgroundSound: "none",
  alarmVolume: 50,
  backgroundVolume: 30,
}

export default function PomodoroTimer() {
  const { data: session, status } = useSession()

  // Settings state
  const [settings, setSettings] = useState<TimerSettings>(DEFAULT_SETTINGS)
  const [isLoadingSettings, setIsLoadingSettings] = useState(true)

  // Timer state
  const [mode, setMode] = useState<TimerMode>("pomodoro")
  const [timeLeft, setTimeLeft] = useState(settings.pomodoroTime * 60)
  const [isActive, setIsActive] = useState(false)
  const [pomodorosCompleted, setPomodorosCompleted] = useState(0)
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null)
  const [endTime, setEndTime] = useState<number | null>(null)

  // Task management state
  const [tasks, setTasks] = useState<Task[]>([])
  const [showAddTask, setShowAddTask] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [newTask, setNewTask] = useState({ projectName: "No Project", title: "", notes: "", estPomodoros: 1 })
  const [isLoadingTasks, setIsLoadingTasks] = useState(true)
  const [projects, setProjects] = useState<string[]>([])

  // Sessions for reporting
  const [sessions, setSessions] = useState<Session[]>([])
  const [sessionStartTime, setSessionStartTime] = useState<string | null>(null)
  const [isLoadingSessions, setIsLoadingSessions] = useState(true)

  // Audio references
  const alarmAudioRef = useRef<HTMLAudioElement | null>(null)
  const backgroundAudioRef = useRef<HTMLAudioElement | null>(null)

  // Load user data from API when authenticated
  useEffect(() => {
    if (status === "authenticated") {
      loadUserData()
    } else if (status === "unauthenticated") {
      setIsLoadingSettings(false)
      setIsLoadingTasks(false)
      setIsLoadingSessions(false)
    }
  }, [status])

  const loadUserData = async () => {
    try {
      // Load settings
      const settingsRes = await fetch("/api/settings")
      if (settingsRes.ok) {
        const userSettings = await settingsRes.json()
        setSettings(userSettings)
      }
      setIsLoadingSettings(false)

      // Load tasks
      const tasksRes = await fetch("/api/tasks")
      if (tasksRes.ok) {
        const userTasks = await tasksRes.json()
        setTasks(userTasks)

        // Extract unique projects
        const uniqueProjects = Array.from(
          new Set(userTasks.map((t: Task) => t.projectName).filter((p: string) => p && p !== "No Project")),
        )
        setProjects(uniqueProjects as string[])
      }
      setIsLoadingTasks(false)

      // Load sessions
      const sessionsRes = await fetch("/api/sessions")
      if (sessionsRes.ok) {
        const userSessions = await sessionsRes.json()
        setSessions(userSessions)
      }
      setIsLoadingSessions(false)

      // Load stats
      const statsRes = await fetch("/api/stats")
      if (statsRes.ok) {
        const stats = await statsRes.json()
        setPomodorosCompleted(stats.pomodorosCompleted)
      }
    } catch (error) {
      console.error("Failed to load user data:", error)
      setIsLoadingSettings(false)
      setIsLoadingTasks(false)
      setIsLoadingSessions(false)
    }
  }

  // Save settings to API
  const saveSettings = async (newSettings: TimerSettings) => {
    setSettings(newSettings)
    if (status === "authenticated") {
      try {
        await fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newSettings),
        })
      } catch (error) {
        console.error("Failed to save settings:", error)
      }
    }
  }

  // Initialize audio
  useEffect(() => {
    alarmAudioRef.current = new Audio("/notification.mp3")
    backgroundAudioRef.current = new Audio()
    backgroundAudioRef.current.loop = true
  }, [])

  // Apply theme
  useEffect(() => {
    if (settings.theme === "dark") {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [settings.theme])

  // Update alarm volume
  useEffect(() => {
    if (alarmAudioRef.current) {
      alarmAudioRef.current.volume = settings.alarmVolume / 100
    }
  }, [settings.alarmVolume])

  // Update background volume and sound
  useEffect(() => {
    if (backgroundAudioRef.current) {
      backgroundAudioRef.current.volume = settings.backgroundVolume / 100
      if (settings.backgroundSound !== "none" && isActive) {
        backgroundAudioRef.current.src = `/sounds/${settings.backgroundSound}.mp3`
        backgroundAudioRef.current.play().catch((e) => console.error("Background audio play failed:", e))
      } else {
        backgroundAudioRef.current.pause()
      }
    }
  }, [settings.backgroundSound, settings.backgroundVolume, isActive])

  // Timer logic
  useEffect(() => {
    let animationFrameId: number

    const updateTimer = () => {
      if (endTime) {
        const now = Date.now()
        const remaining = Math.max(0, Math.ceil((endTime - now) / 1000))

        setTimeLeft(remaining)

        if (remaining === 0) {
          handleTimerComplete()
          setEndTime(null)
        } else {
          animationFrameId = requestAnimationFrame(updateTimer)
        }
      }
    }

    if (isActive && endTime) {
      animationFrameId = requestAnimationFrame(updateTimer)
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  }, [isActive, endTime])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isActive && endTime) {
        // Tab became visible - recalculate time left immediately
        const now = Date.now()
        const remaining = Math.max(0, Math.ceil((endTime - now) / 1000))
        setTimeLeft(remaining)

        if (remaining === 0) {
          handleTimerComplete()
          setEndTime(null)
        }
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [isActive, endTime])

  // Update page title
  useEffect(() => {
    const modeText = mode === "pomodoro" ? "Focus Time" : mode === "short_break" ? "Short Break" : "Long Break"
    document.title = `${formatTime(timeLeft)} - ${modeText}`

    return () => {
      document.title = "Sisyphus Project"
    }
  }, [timeLeft, mode])

  // Start session tracking
  useEffect(() => {
    if (isActive && !sessionStartTime) {
      setSessionStartTime(new Date().toISOString())
    } else if (!isActive && sessionStartTime) {
      setSessionStartTime(null)
    }
  }, [isActive])

  // Reset timer when settings change
  useEffect(() => {
    if (!isActive) {
      resetTimer()
    }
  }, [settings.pomodoroTime, settings.shortBreakTime, settings.longBreakTime])

  const handleTimerComplete = async () => {
    // Play alarm sound
    if (alarmAudioRef.current) {
      alarmAudioRef.current.play().catch((e) => console.error("Alarm play failed:", e))
    }

    // Stop background sound
    if (backgroundAudioRef.current) {
      backgroundAudioRef.current.pause()
    }

    // Get current task info
    const currentTask = tasks.find((t) => t._id === currentTaskId)
    const projectName = currentTask?.projectName || "No Project"
    const taskName = currentTask?.title || null

    // Save session
    if (sessionStartTime) {
      const session: Omit<Session, "_id"> = {
        taskId: currentTaskId,
        projectName: projectName,
        taskName: taskName,
        type: mode,
        startTime: sessionStartTime,
        endTime: new Date().toISOString(),
        durationMinutes:
          mode === "pomodoro"
            ? settings.pomodoroTime
            : mode === "short_break"
              ? settings.shortBreakTime
              : settings.longBreakTime,
      }

      if (status === "authenticated") {
        try {
          const res = await fetch("/api/sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(session),
          })
          if (res.ok) {
            const newSession = await res.json()
            setSessions((prev) => [newSession, ...prev])
          }
        } catch (error) {
          console.error("Failed to save session:", error)
        }
      } else {
        setSessions((prev) => [{ ...session, _id: Date.now().toString() }, ...prev])
      }

      setSessionStartTime(null)
    }

    // Update current task's actual pomodoros
    if (mode === "pomodoro" && currentTaskId) {
      const task = tasks.find((t) => t._id === currentTaskId)
      if (task) {
        const updatedTask = { ...task, actPomodoros: task.actPomodoros + 1 }
        await updateTask(updatedTask)
      }
    }

    // Determine next mode
    if (mode === "pomodoro") {
      const newPomodorosCompleted = pomodorosCompleted + 1
      setPomodorosCompleted(newPomodorosCompleted)

      if (newPomodorosCompleted % settings.longBreakInterval === 0) {
        setMode("long_break")
        setTimeLeft(settings.longBreakTime * 60)
        setIsActive(settings.autoStartBreaks)
      } else {
        setMode("short_break")
        setTimeLeft(settings.shortBreakTime * 60)
        setIsActive(settings.autoStartBreaks)
      }
    } else {
      setMode("pomodoro")
      setTimeLeft(settings.pomodoroTime * 60)
      setIsActive(settings.autoStartPomodoros)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const calculateProgress = () => {
    const totalSeconds =
      mode === "pomodoro"
        ? settings.pomodoroTime * 60
        : mode === "short_break"
          ? settings.shortBreakTime * 60
          : settings.longBreakTime * 60
    return ((totalSeconds - timeLeft) / totalSeconds) * 100
  }

  const toggleTimer = () => {
    if (!isActive) {
      // Starting the timer
      setEndTime(Date.now() + timeLeft * 1000)
    } else {
      // Pausing the timer
      setEndTime(null)
    }
    setIsActive(!isActive)
  }

  const resetTimer = () => {
    setIsActive(false)
    setEndTime(null)
    setTimeLeft(
      mode === "pomodoro"
        ? settings.pomodoroTime * 60
        : mode === "short_break"
          ? settings.shortBreakTime * 60
          : settings.longBreakTime * 60,
    )
    if (backgroundAudioRef.current) {
      backgroundAudioRef.current.pause()
    }
    setSessionStartTime(null)
  }

  const skipTimer = () => {
    setEndTime(Date.now())
    setTimeLeft(0)
  }

  const switchMode = (newMode: TimerMode) => {
    setMode(newMode)
    setIsActive(false)
    setEndTime(null)
    const duration =
      newMode === "pomodoro"
        ? settings.pomodoroTime
        : newMode === "short_break"
          ? settings.shortBreakTime
          : settings.longBreakTime
    setTimeLeft(duration * 60)
    if (backgroundAudioRef.current) {
      backgroundAudioRef.current.pause()
    }
    setSessionStartTime(null)
  }

  // Task management functions
  const addTask = async () => {
    if (newTask.title.trim()) {
      const task: Omit<Task, "_id"> = {
        projectName: newTask.projectName || "No Project",
        title: newTask.title,
        notes: newTask.notes,
        estPomodoros: newTask.estPomodoros,
        actPomodoros: 0,
        isCompleted: false,
        createdAt: new Date().toISOString(),
      }

      if (status === "authenticated") {
        try {
          const res = await fetch("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(task),
          })
          if (res.ok) {
            const newTaskFromDb = await res.json()
            setTasks([newTaskFromDb, ...tasks])

            // Update projects list
            if (task.projectName && task.projectName !== "No Project" && !projects.includes(task.projectName)) {
              setProjects([...projects, task.projectName].sort())
            }
          }
        } catch (error) {
          console.error("Failed to create task:", error)
        }
      } else {
        setTasks([{ ...task, _id: Date.now().toString() }, ...tasks])
      }

      setNewTask({ projectName: "No Project", title: "", notes: "", estPomodoros: 1 })
      setShowAddTask(false)
    }
  }

  const updateTask = async (task: Task) => {
    setTasks(tasks.map((t) => (t._id === task._id ? task : t)))
    setEditingTask(null)

    if (status === "authenticated" && task._id) {
      try {
        await fetch(`/api/tasks/${task._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(task),
        })

        // Update projects list
        const uniqueProjects = Array.from(
          new Set(
            tasks
              .map((t) => (t._id === task._id ? task.projectName : t.projectName))
              .filter((p) => p && p !== "No Project"),
          ),
        )
        setProjects(uniqueProjects as string[])
      } catch (error) {
        console.error("Failed to update task:", error)
      }
    }
  }

  const deleteTask = async (id: string) => {
    setTasks(tasks.filter((t) => t._id !== id))
    if (currentTaskId === id) setCurrentTaskId(null)

    if (status === "authenticated") {
      try {
        await fetch(`/api/tasks/${id}`, {
          method: "DELETE",
        })
      } catch (error) {
        console.error("Failed to delete task:", error)
      }
    }
  }

  const toggleTaskComplete = async (id: string) => {
    const task = tasks.find((t) => t._id === id)
    if (task) {
      const updatedTask = { ...task, isCompleted: !task.isCompleted }
      await updateTask(updatedTask)
    }
  }

  const currentTask = tasks.find((t) => t._id === currentTaskId)
  const incompleteTasks = tasks.filter((t) => !t.isCompleted)
  const totalEstPomodoros = incompleteTasks.reduce((sum, t) => sum + t.estPomodoros, 0)
  const totalActPomodoros = incompleteTasks.reduce((sum, t) => sum + t.actPomodoros, 0)

  const modeColor =
    mode === "pomodoro"
      ? settings.pomodoroColor
      : mode === "short_break"
        ? settings.shortBreakColor
        : settings.longBreakColor

  if (status === "loading" || isLoadingSettings) {
    return (
      <div className="w-full max-w-4xl flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (status === "unauthenticated") {
    return (
      <div className="w-full max-w-4xl space-y-6">
        <Card className="shadow-lg">
          <CardContent className="p-12 text-center space-y-6">
            <h2 className="text-3xl font-bold">Welcome to Sisyphus Project</h2>
            <p className="text-muted-foreground text-lg">A beautiful Pomodoro timer to boost your productivity</p>
            <div className="pt-4">
              <AuthButton />
            </div>
            <p className="text-sm text-muted-foreground">
              Sign in with your email to save your tasks, settings, and track your progress
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl space-y-6">
      <Card className="shadow-lg">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Sisyphus Project</h2>
            <div className="flex gap-2">
              <ReportsDialog sessions={sessions} />
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon">
                    <LucideSettings className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Settings</DialogTitle>
                  </DialogHeader>
                  <Tabs defaultValue="timer" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="timer">Timer</TabsTrigger>
                      <TabsTrigger value="appearance">Appearance</TabsTrigger>
                      <TabsTrigger value="sound">Sound</TabsTrigger>
                    </TabsList>

                    <TabsContent value="timer" className="space-y-4">
                      <div className="space-y-2">
                        <Label>Pomodoro Duration: {settings.pomodoroTime} minutes</Label>
                        <Slider
                          value={[settings.pomodoroTime]}
                          max={60}
                          min={1}
                          step={1}
                          onValueChange={(value) => {
                            saveSettings({ ...settings, pomodoroTime: value[0] })
                            if (!isActive) resetTimer()
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Short Break Duration: {settings.shortBreakTime} minutes</Label>
                        <Slider
                          value={[settings.shortBreakTime]}
                          max={30}
                          min={1}
                          step={1}
                          onValueChange={(value) => {
                            saveSettings({ ...settings, shortBreakTime: value[0] })
                            if (!isActive) resetTimer()
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Long Break Duration: {settings.longBreakTime} minutes</Label>
                        <Slider
                          value={[settings.longBreakTime]}
                          max={60}
                          min={1}
                          step={1}
                          onValueChange={(value) => {
                            saveSettings({ ...settings, longBreakTime: value[0] })
                            if (!isActive) resetTimer()
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Long Break Interval: {settings.longBreakInterval} pomodoros</Label>
                        <Slider
                          value={[settings.longBreakInterval]}
                          max={10}
                          min={2}
                          step={1}
                          onValueChange={(value) => saveSettings({ ...settings, longBreakInterval: value[0] })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="auto-breaks">Auto-start Breaks</Label>
                        <Switch
                          id="auto-breaks"
                          checked={settings.autoStartBreaks}
                          onCheckedChange={(checked) => saveSettings({ ...settings, autoStartBreaks: checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="auto-pomodoros">Auto-start Pomodoros</Label>
                        <Switch
                          id="auto-pomodoros"
                          checked={settings.autoStartPomodoros}
                          onCheckedChange={(checked) => saveSettings({ ...settings, autoStartPomodoros: checked })}
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="appearance" className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="dark-mode">Dark Mode</Label>
                        <Switch
                          id="dark-mode"
                          checked={settings.theme === "dark"}
                          onCheckedChange={(checked) =>
                            saveSettings({ ...settings, theme: checked ? "dark" : "light" })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pomodoro-color">Pomodoro Color</Label>
                        <div className="flex gap-2">
                          <Input
                            id="pomodoro-color"
                            type="color"
                            value={settings.pomodoroColor}
                            onChange={(e) => saveSettings({ ...settings, pomodoroColor: e.target.value })}
                            className="w-20 h-10"
                          />
                          <Input
                            type="text"
                            value={settings.pomodoroColor}
                            onChange={(e) => saveSettings({ ...settings, pomodoroColor: e.target.value })}
                            className="flex-1"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="short-break-color">Short Break Color</Label>
                        <div className="flex gap-2">
                          <Input
                            id="short-break-color"
                            type="color"
                            value={settings.shortBreakColor}
                            onChange={(e) => saveSettings({ ...settings, shortBreakColor: e.target.value })}
                            className="w-20 h-10"
                          />
                          <Input
                            type="text"
                            value={settings.shortBreakColor}
                            onChange={(e) => saveSettings({ ...settings, shortBreakColor: e.target.value })}
                            className="flex-1"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="long-break-color">Long Break Color</Label>
                        <div className="flex gap-2">
                          <Input
                            id="long-break-color"
                            type="color"
                            value={settings.longBreakColor}
                            onChange={(e) => saveSettings({ ...settings, longBreakColor: e.target.value })}
                            className="w-20 h-10"
                          />
                          <Input
                            type="text"
                            value={settings.longBreakColor}
                            onChange={(e) => saveSettings({ ...settings, longBreakColor: e.target.value })}
                            className="flex-1"
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="sound" className="space-y-4">
                      <div className="space-y-2">
                        <Label>Alarm Sound</Label>
                        <Select
                          value={settings.alarmSound}
                          onValueChange={(value) => saveSettings({ ...settings, alarmSound: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ALARM_SOUNDS.map((sound) => (
                              <SelectItem key={sound.value} value={sound.value}>
                                {sound.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Alarm Volume: {settings.alarmVolume}%</Label>
                        <Slider
                          value={[settings.alarmVolume]}
                          max={100}
                          min={0}
                          step={5}
                          onValueChange={(value) => saveSettings({ ...settings, alarmVolume: value[0] })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Background Sound</Label>
                        <Select
                          value={settings.backgroundSound}
                          onValueChange={(value) => saveSettings({ ...settings, backgroundSound: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {BACKGROUND_SOUNDS.map((sound) => (
                              <SelectItem key={sound.value} value={sound.value}>
                                {sound.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Background Volume: {settings.backgroundVolume}%</Label>
                        <Slider
                          value={[settings.backgroundVolume]}
                          max={100}
                          min={0}
                          step={5}
                          onValueChange={(value) => saveSettings({ ...settings, backgroundVolume: value[0] })}
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
                </DialogContent>
              </Dialog>
              <AuthButton />
            </div>
          </div>

          <Tabs value={mode} className="mb-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pomodoro" onClick={() => switchMode("pomodoro")}>
                Pomodoro
              </TabsTrigger>
              <TabsTrigger value="short_break" onClick={() => switchMode("short_break")}>
                Short Break
              </TabsTrigger>
              <TabsTrigger value="long_break" onClick={() => switchMode("long_break")}>
                Long Break
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {currentTask && (
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Current Task</p>
              <p className="font-medium">{currentTask.title}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Project: {currentTask.projectName}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Act: {currentTask.actPomodoros} / Est: {currentTask.estPomodoros}
              </p>
            </div>
          )}

          <div className="flex justify-center items-center mb-8">
            <FlipClock time={formatTime(timeLeft)} color={modeColor} />
          </div>

          <div className="mb-6">
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-1000 ease-linear rounded-full"
                style={{
                  width: `${calculateProgress()}%`,
                  backgroundColor: modeColor,
                }}
              />
            </div>
          </div>

          <div className="flex justify-center space-x-4 mb-6">
            <Button variant={isActive ? "outline" : "default"} size="lg" onClick={toggleTimer} className="w-28">
              {isActive ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
              {isActive ? "Pause" : "Start"}
            </Button>
            <Button variant="outline" size="lg" onClick={resetTimer}>
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="lg" onClick={skipTimer}>
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            <p>
              Pomodoros completed: {pomodorosCompleted} | Next long break in:{" "}
              {settings.longBreakInterval - (pomodorosCompleted % settings.longBreakInterval)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">Tasks</h3>
            <Button onClick={() => setShowAddTask(!showAddTask)} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Task
            </Button>
          </div>

          {showAddTask && (
            <div className="mb-4 p-4 border rounded-lg space-y-3">
              <div className="space-y-2">
                <Label>Project</Label>
                <Select
                  value={newTask.projectName}
                  onValueChange={(value) => setNewTask({ ...newTask, projectName: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="No Project">No Project</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project} value={project}>
                        {project}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Or type new project name..."
                  value={newTask.projectName === "No Project" ? "" : newTask.projectName}
                  onChange={(e) => setNewTask({ ...newTask, projectName: e.target.value || "No Project" })}
                  className="mt-2"
                />
              </div>
              <Input
                placeholder="Task title"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              />
              <Textarea
                placeholder="Notes (optional)"
                value={newTask.notes}
                onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })}
                rows={2}
              />
              <div className="flex items-center gap-2">
                <Label>Estimated Pomodoros:</Label>
                <Input
                  type="number"
                  min="1"
                  value={newTask.estPomodoros.toString()}
                  onChange={(e) => setNewTask({ ...newTask, estPomodoros: Number.parseInt(e.target.value) || 1 })}
                  className="w-20"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={addTask}>Add</Button>
                <Button variant="outline" onClick={() => setShowAddTask(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {isLoadingTasks ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">Loading tasks...</p>
          ) : tasks.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">No tasks yet. Add one to get started!</p>
          ) : (
            <>
              <div className="space-y-2 mb-4">
                {tasks.map((task) => (
                  <div
                    key={task._id}
                    className={`p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                      currentTaskId === task._id ? "border-2 border-orange-500" : ""
                    } ${task.isCompleted ? "opacity-60" : ""}`}
                  >
                    {editingTask?._id === task._id ? (
                      <div className="space-y-2">
                        <div className="space-y-2">
                          <Label>Project</Label>
                          <Input
                            placeholder="Project name"
                            value={editingTask.projectName}
                            onChange={(e) =>
                              setEditingTask({ ...editingTask, projectName: e.target.value || "No Project" })
                            }
                          />
                        </div>
                        <Input
                          value={editingTask.title}
                          onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                          placeholder="Task title"
                        />
                        <Textarea
                          value={editingTask.notes}
                          onChange={(e) => setEditingTask({ ...editingTask, notes: e.target.value })}
                          placeholder="Notes"
                          rows={2}
                        />
                        <div className="flex items-center gap-2">
                          <Label>Est:</Label>
                          <Input
                            type="number"
                            min="1"
                            value={editingTask.estPomodoros.toString()}
                            onChange={(e) =>
                              setEditingTask({ ...editingTask, estPomodoros: Number.parseInt(e.target.value) || 1 })
                            }
                            className="w-20"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => updateTask(editingTask)}>
                            Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingTask(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3">
                        <button onClick={() => toggleTaskComplete(task._id!)} className="mt-1">
                          {task.isCompleted ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <Circle className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                        <div className="flex-1 cursor-pointer" onClick={() => setCurrentTaskId(task._id!)}>
                          <p className={`font-medium ${task.isCompleted ? "line-through" : ""}`}>{task.title}</p>
                          <p className="text-xs text-muted-foreground">{task.projectName}</p>
                          {task.notes && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{task.notes}</p>}
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Act: {task.actPomodoros} / Est: {task.estPomodoros}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => setEditingTask(task)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => deleteTask(task._id!)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {incompleteTasks.length > 0 && (
                <div className="pt-4 border-t text-sm text-gray-600 dark:text-gray-400">
                  <p>
                    Total: {totalActPomodoros} / {totalEstPomodoros} pomodoros
                  </p>
                  <p>
                    Estimated finish:{" "}
                    {new Date(
                      Date.now() + (totalEstPomodoros - totalActPomodoros) * settings.pomodoroTime * 60000,
                    ).toLocaleTimeString()}
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
