"use client"

import { useState, useEffect, useRef } from "react"
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

type TimerMode = "pomodoro" | "short_break" | "long_break"

interface Task {
  id: string
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
  id: string
  taskId: string | null
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
  // Settings state
  const [settings, setSettings] = useState<TimerSettings>(DEFAULT_SETTINGS)

  // Timer state
  const [mode, setMode] = useState<TimerMode>("pomodoro")
  const [timeLeft, setTimeLeft] = useState(settings.pomodoroTime * 60)
  const [isActive, setIsActive] = useState(false)
  const [pomodorosCompleted, setPomodorosCompleted] = useState(0)
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null)

  // Task management state
  const [tasks, setTasks] = useState<Task[]>([])
  const [showAddTask, setShowAddTask] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [newTask, setNewTask] = useState({ title: "", notes: "", estPomodoros: 1 })

  // Sessions for reporting
  const [sessions, setSessions] = useState<Session[]>([])
  const [sessionStartTime, setSessionStartTime] = useState<string | null>(null)

  // Audio references
  const alarmAudioRef = useRef<HTMLAudioElement | null>(null)
  const backgroundAudioRef = useRef<HTMLAudioElement | null>(null)

  // Load data from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem("pomodoroSettings")
    const savedTasks = localStorage.getItem("pomodoroTasks")
    const savedSessions = localStorage.getItem("pomodoroSessions")
    const savedPomodoros = localStorage.getItem("pomodorosCompleted")
    const savedCurrentTask = localStorage.getItem("currentTaskId")

    if (savedSettings) setSettings(JSON.parse(savedSettings))
    if (savedTasks) setTasks(JSON.parse(savedTasks))
    if (savedSessions) setSessions(JSON.parse(savedSessions))
    if (savedPomodoros) setPomodorosCompleted(Number.parseInt(savedPomodoros))
    if (savedCurrentTask) setCurrentTaskId(savedCurrentTask)

    // Initialize audio
    alarmAudioRef.current = new Audio("/notification.mp3")
    backgroundAudioRef.current = new Audio()
    backgroundAudioRef.current.loop = true
  }, [])

  // Save data to localStorage
  useEffect(() => {
    localStorage.setItem("pomodoroSettings", JSON.stringify(settings))
  }, [settings])

  useEffect(() => {
    localStorage.setItem("pomodoroTasks", JSON.stringify(tasks))
  }, [tasks])

  useEffect(() => {
    localStorage.setItem("pomodoroSessions", JSON.stringify(sessions))
  }, [sessions])

  useEffect(() => {
    localStorage.setItem("pomodorosCompleted", pomodorosCompleted.toString())
  }, [pomodorosCompleted])

  useEffect(() => {
    if (currentTaskId) {
      localStorage.setItem("currentTaskId", currentTaskId)
    } else {
      localStorage.removeItem("currentTaskId")
    }
  }, [currentTaskId])

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
    let interval: NodeJS.Timeout | null = null

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1)
      }, 1000)
    } else if (isActive && timeLeft === 0) {
      handleTimerComplete()
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isActive, timeLeft])

  // Update page title
  useEffect(() => {
    const modeText = mode === "pomodoro" ? "Focus Time" : mode === "short_break" ? "Short Break" : "Long Break"
    document.title = `${formatTime(timeLeft)} - ${modeText}`

    return () => {
      document.title = "Pomodoro Timer"
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

  const handleTimerComplete = () => {
    // Play alarm sound
    if (alarmAudioRef.current) {
      alarmAudioRef.current.play().catch((e) => console.error("Alarm play failed:", e))
    }

    // Stop background sound
    if (backgroundAudioRef.current) {
      backgroundAudioRef.current.pause()
    }

    // Save session
    if (sessionStartTime) {
      const session: Session = {
        id: Date.now().toString(),
        taskId: currentTaskId,
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
      setSessions((prev) => [...prev, session])
      setSessionStartTime(null)
    }

    // Update current task's actual pomodoros
    if (mode === "pomodoro" && currentTaskId) {
      setTasks((prev) =>
        prev.map((task) => (task.id === currentTaskId ? { ...task, actPomodoros: task.actPomodoros + 1 } : task)),
      )
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
    setIsActive(!isActive)
  }

  const resetTimer = () => {
    setIsActive(false)
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
    setTimeLeft(0)
  }

  const switchMode = (newMode: TimerMode) => {
    setMode(newMode)
    setIsActive(false)
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
  const addTask = () => {
    if (newTask.title.trim()) {
      const task: Task = {
        id: Date.now().toString(),
        title: newTask.title,
        notes: newTask.notes,
        estPomodoros: newTask.estPomodoros,
        actPomodoros: 0,
        isCompleted: false,
        createdAt: new Date().toISOString(),
      }
      setTasks([...tasks, task])
      setNewTask({ title: "", notes: "", estPomodoros: 1 })
      setShowAddTask(false)
    }
  }

  const updateTask = (task: Task) => {
    setTasks(tasks.map((t) => (t.id === task.id ? task : t)))
    setEditingTask(null)
  }

  const deleteTask = (id: string) => {
    setTasks(tasks.filter((t) => t.id !== id))
    if (currentTaskId === id) setCurrentTaskId(null)
  }

  const toggleTaskComplete = (id: string) => {
    setTasks(tasks.map((t) => (t.id === id ? { ...t, isCompleted: !t.isCompleted } : t)))
  }

  const currentTask = tasks.find((t) => t.id === currentTaskId)
  const incompleteTasks = tasks.filter((t) => !t.isCompleted)
  const totalEstPomodoros = incompleteTasks.reduce((sum, t) => sum + t.estPomodoros, 0)
  const totalActPomodoros = incompleteTasks.reduce((sum, t) => sum + t.actPomodoros, 0)

  const modeColor =
    mode === "pomodoro"
      ? settings.pomodoroColor
      : mode === "short_break"
        ? settings.shortBreakColor
        : settings.longBreakColor

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
                            setSettings({ ...settings, pomodoroTime: value[0] })
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
                            setSettings({ ...settings, shortBreakTime: value[0] })
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
                            setSettings({ ...settings, longBreakTime: value[0] })
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
                          onValueChange={(value) => setSettings({ ...settings, longBreakInterval: value[0] })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="auto-breaks">Auto-start Breaks</Label>
                        <Switch
                          id="auto-breaks"
                          checked={settings.autoStartBreaks}
                          onCheckedChange={(checked) => setSettings({ ...settings, autoStartBreaks: checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="auto-pomodoros">Auto-start Pomodoros</Label>
                        <Switch
                          id="auto-pomodoros"
                          checked={settings.autoStartPomodoros}
                          onCheckedChange={(checked) => setSettings({ ...settings, autoStartPomodoros: checked })}
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="appearance" className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="dark-mode">Dark Mode</Label>
                        <Switch
                          id="dark-mode"
                          checked={settings.theme === "dark"}
                          onCheckedChange={(checked) => setSettings({ ...settings, theme: checked ? "dark" : "light" })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pomodoro-color">Pomodoro Color</Label>
                        <div className="flex gap-2">
                          <Input
                            id="pomodoro-color"
                            type="color"
                            value={settings.pomodoroColor}
                            onChange={(e) => setSettings({ ...settings, pomodoroColor: e.target.value })}
                            className="w-20 h-10"
                          />
                          <Input
                            type="text"
                            value={settings.pomodoroColor}
                            onChange={(e) => setSettings({ ...settings, pomodoroColor: e.target.value })}
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
                            onChange={(e) => setSettings({ ...settings, shortBreakColor: e.target.value })}
                            className="w-20 h-10"
                          />
                          <Input
                            type="text"
                            value={settings.shortBreakColor}
                            onChange={(e) => setSettings({ ...settings, shortBreakColor: e.target.value })}
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
                            onChange={(e) => setSettings({ ...settings, longBreakColor: e.target.value })}
                            className="w-20 h-10"
                          />
                          <Input
                            type="text"
                            value={settings.longBreakColor}
                            onChange={(e) => setSettings({ ...settings, longBreakColor: e.target.value })}
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
                          onValueChange={(value) => setSettings({ ...settings, alarmSound: value })}
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
                          onValueChange={(value) => setSettings({ ...settings, alarmVolume: value[0] })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Background Sound</Label>
                        <Select
                          value={settings.backgroundSound}
                          onValueChange={(value) => setSettings({ ...settings, backgroundSound: value })}
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
                          onValueChange={(value) => setSettings({ ...settings, backgroundVolume: value[0] })}
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
                </DialogContent>
              </Dialog>
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

          {tasks.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">No tasks yet. Add one to get started!</p>
          ) : (
            <>
              <div className="space-y-2 mb-4">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                      currentTaskId === task.id ? "border-2 border-orange-500" : ""
                    } ${task.isCompleted ? "opacity-60" : ""}`}
                  >
                    {editingTask?.id === task.id ? (
                      <div className="space-y-2">
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
                        <button onClick={() => toggleTaskComplete(task.id)} className="mt-1">
                          {task.isCompleted ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <Circle className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                        <div className="flex-1 cursor-pointer" onClick={() => setCurrentTaskId(task.id)}>
                          <p className={`font-medium ${task.isCompleted ? "line-through" : ""}`}>{task.title}</p>
                          {task.notes && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{task.notes}</p>}
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Act: {task.actPomodoros} / Est: {task.estPomodoros}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => setEditingTask(task)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => deleteTask(task.id)}>
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
