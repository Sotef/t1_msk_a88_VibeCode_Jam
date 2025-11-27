"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart3, Users, AlertTriangle, CheckCircle, LogOut, Eye, Trash2, Download, Upload } from "lucide-react"
import { TaskForm } from "./components/task-form"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

interface DashboardData {
  total_interviews: number
  completed_interviews: number
  in_progress: number
  average_scores: {
    overall: number
    technical: number
    softskills: number
  }
  flagged_interviews: number
  recent_interviews: Array<{
    id: string
    candidate_name: string
    direction: string
    status: string
    overall_score: number
    created_at: string
  }>
}

interface Interview {
  id: string
  candidate_name: string
  candidate_email: string
  direction: string
  difficulty: string
  status: string
  overall_score: number
  technical_score: number
  softskills_score: number
  tasks_completed: number
  total_tasks: number
  hints_used: number
  anti_cheat_flags: number
  recommendation: string
  created_at: string
  finished_at: string | null
}

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [token, setToken] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loginError, setLoginError] = useState("")

  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [statusFilter, setStatusFilter] = useState("all")
  const [flaggedOnly, setFlaggedOnly] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError("")

    try {
      const res = await fetch(`${API_BASE}/api/admin/login?username=${username}&password=${password}`, {
        method: "POST",
      })

      if (!res.ok) {
        throw new Error("Invalid credentials")
      }

      const data = await res.json()
      setToken(data.access_token)
      setIsLoggedIn(true)
      localStorage.setItem("admin_token", data.access_token)
    } catch {
      setLoginError("Неверные учетные данные")
    }
  }

  const fetchDashboard = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setDashboard(await res.json())
      }
    } catch (error) {
      console.error("Failed to fetch dashboard:", error)
    }
  }

  const fetchInterviews = async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.set("status", statusFilter)
      if (flaggedOnly) params.set("flagged_only", "true")

      const res = await fetch(`${API_BASE}/api/admin/interviews?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setInterviews(data.interviews)
      }
    } catch (error) {
      console.error("Failed to fetch interviews:", error)
    }
  }

  useEffect(() => {
    const savedToken = localStorage.getItem("admin_token")
    if (savedToken) {
      setToken(savedToken)
      setIsLoggedIn(true)
    }
  }, [])

  useEffect(() => {
    if (isLoggedIn && token) {
      fetchDashboard()
      fetchInterviews()
    }
  }, [isLoggedIn, token, statusFilter, flaggedOnly])

  const handleLogout = () => {
    setIsLoggedIn(false)
    setToken("")
    localStorage.removeItem("admin_token")
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Панель администратора</CardTitle>
            <CardDescription>Войдите для доступа к отчётам</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Имя пользователя</Label>
                <Input id="username" value={username} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Пароль</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  required
                />
              </div>
              {loginError && <p className="text-sm text-destructive">{loginError}</p>}
              <Button type="submit" className="w-full">
                Войти
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">AI Interview - Админ панель</h1>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Выйти
          </Button>
        </div>
      </header>

      <main className="p-6">
        <Tabs defaultValue="dashboard">
          <TabsList className="mb-6">
            <TabsTrigger value="dashboard">Дашборд</TabsTrigger>
            <TabsTrigger value="interviews">Интервью</TabsTrigger>
            <TabsTrigger value="task-bank">Банк задач</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            {dashboard && (
              <div className="space-y-6">
                {/* Stats */}
                <div className="grid gap-4 md:grid-cols-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground">Всего интервью</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{dashboard.total_interviews}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground">Завершено</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-success">{dashboard.completed_interviews}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground">В процессе</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-primary">{dashboard.in_progress}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                        Подозрительные
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-destructive">{dashboard.flagged_interviews}</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Scores */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Средние оценки
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="text-center p-4 bg-secondary/30 rounded-lg">
                        <div className="text-3xl font-bold">{dashboard.average_scores.overall}%</div>
                        <div className="text-sm text-muted-foreground">Общий балл</div>
                      </div>
                      <div className="text-center p-4 bg-secondary/30 rounded-lg">
                        <div className="text-3xl font-bold">{dashboard.average_scores.technical}%</div>
                        <div className="text-sm text-muted-foreground">Технические</div>
                      </div>
                      <div className="text-center p-4 bg-secondary/30 rounded-lg">
                        <div className="text-3xl font-bold">{dashboard.average_scores.softskills}%</div>
                        <div className="text-sm text-muted-foreground">Soft Skills</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Interviews */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Недавние интервью
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Кандидат</TableHead>
                          <TableHead>Направление</TableHead>
                          <TableHead>Статус</TableHead>
                          <TableHead>Оценка</TableHead>
                          <TableHead>Дата</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dashboard.recent_interviews.map((interview: DashboardData["recent_interviews"][0]) => (
                          <TableRow key={interview.id}>
                            <TableCell className="font-medium">{interview.candidate_name}</TableCell>
                            <TableCell>{interview.direction}</TableCell>
                            <TableCell>
                              <Badge variant={interview.status === "completed" ? "default" : "secondary"}>
                                {interview.status === "completed" ? "Завершено" : "В процессе"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {interview.overall_score ? `${Math.round(interview.overall_score)}%` : "-"}
                            </TableCell>
                            <TableCell>{new Date(interview.created_at).toLocaleDateString("ru")}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="interviews">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Все интервью</CardTitle>
                  <div className="flex gap-2">
                    <Select value={statusFilter} onValueChange={(value: string) => setStatusFilter(value)}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Статус" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все</SelectItem>
                        <SelectItem value="completed">Завершенные</SelectItem>
                        <SelectItem value="in_progress">В процессе</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant={flaggedOnly ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFlaggedOnly(!flaggedOnly)}
                    >
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      Подозрительные
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Кандидат</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Направление</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Оценка</TableHead>
                      <TableHead>Задачи</TableHead>
                      <TableHead>Флаги</TableHead>
                      <TableHead>Рекомендация</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {interviews.map((interview: Interview) => (
                      <TableRow key={interview.id}>
                        <TableCell className="font-medium">{interview.candidate_name}</TableCell>
                        <TableCell className="text-muted-foreground">{interview.candidate_email}</TableCell>
                        <TableCell>{interview.direction}</TableCell>
                        <TableCell>
                          <Badge variant={interview.status === "completed" ? "default" : "secondary"}>
                            {interview.status === "completed" ? "Завершено" : "В процессе"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {interview.overall_score ? (
                            <span
                              className={
                                interview.overall_score >= 70
                                  ? "text-success"
                                  : interview.overall_score >= 40
                                    ? "text-warning"
                                    : "text-destructive"
                              }
                            >
                              {Math.round(interview.overall_score)}%
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {interview.tasks_completed}/{interview.total_tasks}
                        </TableCell>
                        <TableCell>
                          {interview.anti_cheat_flags > 0 ? (
                            <Badge variant="destructive">{interview.anti_cheat_flags}</Badge>
                          ) : (
                            <CheckCircle className="h-4 w-4 text-success" />
                          )}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{interview.recommendation || "-"}</TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              window.location.href = `/admin/${interview.id}`
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="task-bank">
            <TaskBankTab token={token} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

// Task Bank Component
interface TaskBankTask {
  id: string
  title: string
  task_type: string
  difficulty: string
  direction: string
  times_used?: number
}

function TaskBankTab({ token }: { token: string }) {
  const [tasks, setTasks] = useState<TaskBankTask[]>([])
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())
  const [showSingleForm, setShowSingleForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTasks = useCallback(async () => {
    if (!token) {
      setLoading(false)
      setError("Токен авторизации отсутствует")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/admin/task-bank`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setTasks(data.tasks || [])
        setError(null)
      } else {
        const errorText = await res.text()
        console.error("Failed to fetch tasks:", res.status, res.statusText, errorText)
        setError(`Ошибка загрузки: ${res.status} ${res.statusText}`)
        setTasks([])
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error)
      setError(`Ошибка сети: ${error instanceof Error ? error.message : "Неизвестная ошибка"}`)
      setTasks([])
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (token) {
      fetchTasks()
    }
  }, [token, fetchTasks])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch(`${API_BASE}/api/admin/task-bank/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      if (res.ok) {
        const data = await res.json()
        alert(`Загружено задач: ${data.count}`)
        fetchTasks()
      } else {
        alert("Ошибка загрузки")
      }
    } catch (error) {
      console.error("Upload error:", error)
      alert("Ошибка загрузки")
    }
  }


  const handleDelete = async (taskId: string) => {
    if (!confirm("Удалить задачу?")) return
    try {
      const res = await fetch(`${API_BASE}/api/admin/task-bank/${taskId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        fetchTasks()
      }
    } catch (error) {
      console.error("Delete error:", error)
    }
  }

  const handleExport = async (format: string) => {
    const ids = selectedTasks.size > 0 ? Array.from(selectedTasks).join(",") : "all"
    try {
      const res = await fetch(`${API_BASE}/api/admin/task-bank/export?task_ids=${ids}&format=${format}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `tasks_export.${format === "xlsx" ? "xlsx" : format === "csv" ? "csv" : "json"}`
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error("Export error:", error)
    }
  }

  return (
    <div className="space-y-6">
      {showSingleForm ? (
        <TaskForm
          token={token}
          onSuccess={() => {
            setShowSingleForm(false)
            fetchTasks()
          }}
          onCancel={() => setShowSingleForm(false)}
        />
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Банк задач</CardTitle>
              <Button variant="outline" onClick={() => setShowSingleForm(true)}>
                Добавить задачу
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 p-4 border-2 border-dashed rounded-lg bg-muted/50">
              <div className="flex flex-col items-center justify-center gap-2">
                <Label htmlFor="file-upload" className="text-lg font-semibold cursor-pointer">
                  Загрузить задачи из файла
                </Label>
                <p className="text-sm text-muted-foreground text-center">
                  Поддерживаемые форматы: CSV, JSON, XLSX
                </p>
                <label htmlFor="file-upload" className="cursor-pointer">
                  <input
                    id="file-upload"
                    type="file"
                    accept=".csv,.json,.xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button variant="outline" size="lg" asChild>
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      Выбрать файл
                    </span>
                  </Button>
                </label>
              </div>
            </div>

            {selectedTasks.size > 0 && (
              <div className="flex gap-2 mb-4">
                <Button variant="outline" size="sm" onClick={() => handleExport("json")}>
                  <Download className="h-4 w-4 mr-1" />
                  Экспорт JSON ({selectedTasks.size})
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExport("csv")}>
                  <Download className="h-4 w-4 mr-1" />
                  CSV ({selectedTasks.size})
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExport("xlsx")}>
                  <Download className="h-4 w-4 mr-1" />
                  XLSX ({selectedTasks.size})
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedTasks(new Set())}>
                  Снять выделение
                </Button>
              </div>
            )}

            <div className="flex gap-2 mb-4">
              <Button variant="outline" size="sm" onClick={() => handleExport("json")}>
                <Download className="h-4 w-4 mr-1" />
                Экспорт всех (JSON)
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExport("csv")}>
                <Download className="h-4 w-4 mr-1" />
                Экспорт всех (CSV)
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExport("xlsx")}>
                <Download className="h-4 w-4 mr-1" />
                Экспорт всех (XLSX)
              </Button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded text-destructive text-sm">
                {error}
                <Button variant="ghost" size="sm" className="ml-2" onClick={() => fetchTasks()}>
                  Повторить
                </Button>
              </div>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        if (e.target.checked) {
                          setSelectedTasks(new Set(tasks.map((t: TaskBankTask) => t.id)))
                        } else {
                          setSelectedTasks(new Set())
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Название</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Сложность</TableHead>
                  <TableHead>Направление</TableHead>
                  <TableHead>Использований</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">Загрузка...</TableCell>
                  </TableRow>
                ) : error && tasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-destructive">
                      {error}
                    </TableCell>
                  </TableRow>
                ) : tasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">Задач пока нет</TableCell>
                  </TableRow>
                ) : (
                  tasks.map((task: TaskBankTask) => (
                    <TableRow key={task.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedTasks.has(task.id)}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const newSet = new Set(selectedTasks)
                            if (e.target.checked) {
                              newSet.add(task.id)
                            } else {
                              newSet.delete(task.id)
                            }
                            setSelectedTasks(newSet)
                          }}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{task.title || "Без названия"}</TableCell>
                      <TableCell>{task.task_type || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={task.difficulty === "easy" ? "default" : task.difficulty === "medium" ? "secondary" : "destructive"}>
                          {task.difficulty || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell>{task.direction || "-"}</TableCell>
                      <TableCell>{task.times_used || 0}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(task.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
