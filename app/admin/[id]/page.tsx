"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft } from "lucide-react"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

// Функция для перевода типов событий античита на русский
function getAntiCheatEventTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    "tab_switch": "Переключение вкладки",
    "copy_paste": "Копирование/вставка",
    "devtools_open": "Открытие DevTools",
    "focus_loss": "Потеря фокуса",
    "large_paste": "Большая вставка",
    "suspicious_typing": "Подозрительный паттерн печати",
    "code_change_timestamp": "Изменение кода",
    "large_code_change": "Большое изменение кода",
    "external_service_request": "Запрос к внешнему сервису",
    "ai_service_request": "Запрос к AI-сервису",
    "call_service_request": "Запрос к сервису звонков",
    "frequent_paste": "Частая вставка",
    "code_paste": "Вставка кода",
  }
  return labels[type] || type
}

export default function InterviewDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const interviewId = params.id as string
  const [interview, setInterview] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("admin_token")
    if (!token) {
      router.push("/admin")
      return
    }

    fetch(`${API_BASE}/api/admin/interviews/${interviewId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`)
        }
        return res.json()
      })
      .then((data) => {
        setInterview(data)
        setLoading(false)
      })
      .catch((error) => {
        console.error("Failed to fetch interview:", error)
        setLoading(false)
      })
  }, [interviewId, router])

  if (loading) return <div>Загрузка...</div>
  if (!interview) return <div>Интервью не найдено</div>

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <Button variant="outline" onClick={() => router.push("/admin")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Назад
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Информация о кандидате</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div><strong>Имя:</strong> {interview.interview.candidate_name}</div>
            <div><strong>Email:</strong> {interview.interview.candidate_email}</div>
            <div><strong>Направление:</strong> {interview.interview.direction}</div>
            <div><strong>Сложность:</strong> {interview.interview.difficulty}</div>
            <div><strong>Статус:</strong> {interview.interview.status}</div>
            <div><strong>Общий балл:</strong> {interview.interview.overall_score?.toFixed(1) || "-"}%</div>
            <div><strong>Технический балл:</strong> {interview.interview.technical_score?.toFixed(1) || "-"}%</div>
            <div><strong>Soft Skills:</strong> {interview.interview.softskills_score?.toFixed(1) || "-"}%</div>
            <div><strong>Использовано подсказок:</strong> {interview.interview.hints_used}</div>
            <div><strong>Флаги античита:</strong> {interview.interview.anti_cheat_flags}</div>
            <div><strong>Рекомендация:</strong> {interview.interview.recommendation || "-"}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Задачи</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {interview.tasks.map((task: any, idx: number) => (
                <div key={task.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">Задача {task.task_number}: {task.title}</h3>
                    <Badge>{task.task_type}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">{task.description}</div>
                  <div className="space-y-1 text-sm">
                    <div><strong>Оценка:</strong> {task.score?.toFixed(1) || "-"}%</div>
                    <div><strong>Качество кода:</strong> {task.code_quality?.toFixed(1) || "-"}</div>
                    <div><strong>Эффективность:</strong> {task.efficiency?.toFixed(1) || "-"}</div>
                    <div><strong>Правильность:</strong> {task.correctness?.toFixed(1) || "-"}</div>
                    <div><strong>Подсказок использовано:</strong> {task.hints_used || 0}</div>
                    {task.feedback && (
                      <div className="mt-2 p-2 bg-secondary/30 rounded">
                        <strong>Обратная связь:</strong> {task.feedback}
                      </div>
                    )}
                    {task.submitted_code && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-primary">Показать код</summary>
                        <pre className="mt-2 p-2 bg-black text-white rounded text-xs overflow-auto">
                          {task.submitted_code}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {interview.anti_cheat_events && interview.anti_cheat_events.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>События античита</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {interview.anti_cheat_events.map((event: any, idx: number) => (
                  <div key={idx} className="border rounded p-2 text-sm">
                    <div><strong>Тип:</strong> {getAntiCheatEventTypeLabel(event.type)} <span className="text-muted-foreground text-xs">({event.type})</span></div>
                    <div><strong>Серьезность:</strong> {event.severity}</div>
                    <div><strong>Время:</strong> {new Date(event.timestamp).toLocaleString("ru")}</div>
                    {event.details && <div><strong>Детали:</strong> {JSON.stringify(event.details)}</div>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

