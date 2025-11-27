"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { CheckCircle, Award, TrendingUp, Lightbulb, Home, Code2, MessageSquare } from "lucide-react"

interface FeedbackReportProps {
  feedback: {
    candidate_name: string
    overall_score: number
    technical_score: number
    softskills_score: number
    tasks_completed: number
    total_tasks: number
    hints_used: number
    anti_cheat_flags: number
    strengths: string[]
    areas_for_improvement: string[]
    recommendation: string
    detailed_task_results: Array<{
      title: string
      score: number
      feedback: string
      code_quality: number
      efficiency: number
      correctness: number
      hints_used: number
      time_spent_seconds?: number
      submission_attempts?: number
      test_runs?: number
      compilation_errors?: number
      execution_errors?: number
    }>
    total_time_seconds?: number
    average_task_time_seconds?: number
    total_submission_attempts?: number
    total_test_runs?: number
    total_compilation_errors?: number
    total_execution_errors?: number
    technical_feedback?: string
    softskills_feedback?: string
    softskills_assessment: {
      communication?: number
      problem_solving?: number
      teamwork?: number
      notes?: string
    }
  }
}

export function FeedbackReport({ feedback }: FeedbackReportProps) {
  const router = useRouter()

  const handleReturnHome = () => {
    router.push("/")
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-success"
    if (score >= 60) return "text-warning"
    return "text-destructive"
  }

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-success/20"
    if (score >= 60) return "bg-warning/20"
    return "bg-destructive/20"
  }

  const getRecommendationBadge = (rec: string) => {
    const lower = rec.toLowerCase()
    if (lower.includes("hire") || lower.includes("принять")) {
      return <Badge className="bg-success text-success-foreground">Рекомендуется</Badge>
    }
    if (lower.includes("consider") || lower.includes("рассмотреть")) {
      return <Badge className="bg-warning text-warning-foreground">На рассмотрение</Badge>
    }
    return <Badge className="bg-destructive text-destructive-foreground">Не рекомендуется</Badge>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{feedback.candidate_name}</CardTitle>
              <p className="text-muted-foreground mt-1">Результаты технического интервью</p>
            </div>
            {getRecommendationBadge(feedback.recommendation)}
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            {/* Overall Score */}
            <div className="text-center">
              <div className={`text-5xl font-bold ${getScoreColor(feedback.overall_score)}`}>
                {Math.round(feedback.overall_score)}%
              </div>
              <p className="text-sm text-muted-foreground mt-1">Общий балл</p>
            </div>

            {/* Technical Score */}
            <div className="text-center">
              <div className={`text-5xl font-bold ${getScoreColor(feedback.technical_score)}`}>
                {Math.round(feedback.technical_score)}%
              </div>
              <p className="text-sm text-muted-foreground mt-1">Технические навыки</p>
            </div>

            {/* Soft Skills Score */}
            <div className="text-center">
              <div className={`text-5xl font-bold ${getScoreColor(feedback.softskills_score)}`}>
                {Math.round(feedback.softskills_score)}%
              </div>
              <p className="text-sm text-muted-foreground mt-1">Soft Skills</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t">
            <div className="text-center">
              <div className="text-2xl font-semibold">
                {feedback.tasks_completed}/{feedback.total_tasks}
              </div>
              <p className="text-xs text-muted-foreground">Задач выполнено</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold">{feedback.hints_used}</div>
              <p className="text-xs text-muted-foreground">Подсказок использовано</p>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-semibold ${feedback.anti_cheat_flags > 2 ? "text-destructive" : ""}`}>
                {feedback.anti_cheat_flags}
              </div>
              <p className="text-xs text-muted-foreground">Флагов безопасности</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold">
                {Math.round((feedback.tasks_completed / feedback.total_tasks) * 100)}%
              </div>
              <p className="text-xs text-muted-foreground">Завершение</p>
            </div>
          </div>

          {/* Additional Metrics */}
          {(feedback.total_time_seconds !== undefined || feedback.average_task_time_seconds !== undefined || 
            feedback.total_submission_attempts !== undefined || feedback.total_test_runs !== undefined) && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
              {feedback.total_time_seconds !== undefined && (
                <div className="text-center">
                  <div className="text-xl font-semibold">
                    {Math.floor(feedback.total_time_seconds / 60)}:{(feedback.total_time_seconds % 60).toString().padStart(2, "0")}
                  </div>
                  <p className="text-xs text-muted-foreground">Общее время</p>
                </div>
              )}
              {feedback.average_task_time_seconds !== undefined && (
                <div className="text-center">
                  <div className="text-xl font-semibold">
                    {Math.floor(feedback.average_task_time_seconds / 60)}:{(feedback.average_task_time_seconds % 60).toString().padStart(2, "0")}
                  </div>
                  <p className="text-xs text-muted-foreground">Среднее время на задачу</p>
                </div>
              )}
              {feedback.total_submission_attempts !== undefined && (
                <div className="text-center">
                  <div className="text-xl font-semibold">{feedback.total_submission_attempts}</div>
                  <p className="text-xs text-muted-foreground">Попыток отправки</p>
                </div>
              )}
              {feedback.total_test_runs !== undefined && (
                <div className="text-center">
                  <div className="text-xl font-semibold">{feedback.total_test_runs}</div>
                  <p className="text-xs text-muted-foreground">Запусков тестов</p>
                </div>
              )}
              {feedback.total_compilation_errors !== undefined && feedback.total_compilation_errors > 0 && (
                <div className="text-center">
                  <div className={`text-xl font-semibold ${feedback.total_compilation_errors > 5 ? "text-destructive" : "text-warning"}`}>
                    {feedback.total_compilation_errors}
                  </div>
                  <p className="text-xs text-muted-foreground">Ошибок компиляции</p>
                </div>
              )}
              {feedback.total_execution_errors !== undefined && feedback.total_execution_errors > 0 && (
                <div className="text-center">
                  <div className={`text-xl font-semibold ${feedback.total_execution_errors > 5 ? "text-destructive" : "text-warning"}`}>
                    {feedback.total_execution_errors}
                  </div>
                  <p className="text-xs text-muted-foreground">Ошибок выполнения</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Strengths & Improvements */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              Сильные стороны
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {feedback.strengths.map((strength, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-success mt-1">✓</span>
                  {strength}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Области для развития
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {feedback.areas_for_improvement.map((area, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-primary mt-1">→</span>
                  {area}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Task Results */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Результаты по задачам</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {feedback.detailed_task_results.map((task, i) => (
            <div key={i} className={`p-4 rounded-lg ${getScoreBg(task.score)}`}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{task.title}</h4>
                <div className="flex items-center gap-2">
                  {task.hints_used > 0 && (
                    <Badge variant="outline" className="text-xs">
                      <Lightbulb className="h-3 w-3 mr-1" />
                      {task.hints_used} подсказок
                    </Badge>
                  )}
                  <span className={`font-bold ${getScoreColor(task.score)}`}>{Math.round(task.score)}%</span>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-3">{task.feedback}</p>

              <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Качество кода</div>
                  <Progress value={task.code_quality} className="h-2" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Эффективность</div>
                  <Progress value={task.efficiency} className="h-2" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Корректность</div>
                  <Progress value={task.correctness} className="h-2" />
                </div>
              </div>

              {/* Task-specific metrics */}
              {(task.time_spent_seconds !== undefined || task.submission_attempts !== undefined || 
                task.test_runs !== undefined || task.compilation_errors !== undefined || 
                task.execution_errors !== undefined) && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs pt-2 border-t">
                  {task.time_spent_seconds !== undefined && (
                    <div>
                      <span className="text-muted-foreground">Время: </span>
                      <span className="font-medium">
                        {Math.floor(task.time_spent_seconds / 60)}:{(task.time_spent_seconds % 60).toString().padStart(2, "0")}
                      </span>
                    </div>
                  )}
                  {task.submission_attempts !== undefined && task.submission_attempts > 0 && (
                    <div>
                      <span className="text-muted-foreground">Попыток: </span>
                      <span className="font-medium">{task.submission_attempts}</span>
                    </div>
                  )}
                  {task.test_runs !== undefined && task.test_runs > 0 && (
                    <div>
                      <span className="text-muted-foreground">Тестов: </span>
                      <span className="font-medium">{task.test_runs}</span>
                    </div>
                  )}
                  {task.compilation_errors !== undefined && task.compilation_errors > 0 && (
                    <div>
                      <span className="text-muted-foreground">Ошибок компиляции: </span>
                      <span className="font-medium text-destructive">{task.compilation_errors}</span>
                    </div>
                  )}
                  {task.execution_errors !== undefined && task.execution_errors > 0 && (
                    <div>
                      <span className="text-muted-foreground">Ошибок выполнения: </span>
                      <span className="font-medium text-destructive">{task.execution_errors}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Soft Skills Assessment */}
      {feedback.softskills_assessment && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Оценка Soft Skills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6 mb-4">
              {feedback.softskills_assessment.communication !== undefined && (
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Коммуникация</div>
                  <div className="flex items-center gap-2">
                    <Progress value={feedback.softskills_assessment.communication} className="flex-1" />
                    <span className="text-sm font-medium">{feedback.softskills_assessment.communication}%</span>
                  </div>
                </div>
              )}
              {feedback.softskills_assessment.problem_solving !== undefined && (
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Решение проблем</div>
                  <div className="flex items-center gap-2">
                    <Progress value={feedback.softskills_assessment.problem_solving} className="flex-1" />
                    <span className="text-sm font-medium">{feedback.softskills_assessment.problem_solving}%</span>
                  </div>
                </div>
              )}
              {feedback.softskills_assessment.teamwork !== undefined && (
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Командная работа</div>
                  <div className="flex items-center gap-2">
                    <Progress value={feedback.softskills_assessment.teamwork} className="flex-1" />
                    <span className="text-sm font-medium">{feedback.softskills_assessment.teamwork}%</span>
                  </div>
                </div>
              )}
            </div>
            {feedback.softskills_assessment.notes && (
              <p className="text-sm text-muted-foreground">{feedback.softskills_assessment.notes}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recommendation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Award className="h-5 w-5" />
            Рекомендация
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{feedback.recommendation}</p>
        </CardContent>
      </Card>

      {/* LLM Feedback */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Technical Feedback */}
        {feedback.technical_feedback && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Code2 className="h-5 w-5 text-primary" />
                Обратная связь от технического интервьюера
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {feedback.technical_feedback}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Soft Skills Feedback */}
        {feedback.softskills_feedback && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Обратная связь от интервьюера по soft skills
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {feedback.softskills_feedback}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Return Home Button */}
      <div className="flex justify-center pt-4">
        <Button onClick={handleReturnHome} size="lg" className="w-full max-w-md">
          <Home className="mr-2 h-5 w-5" />
          Вернуться на главную
        </Button>
      </div>
    </div>
  )
}
