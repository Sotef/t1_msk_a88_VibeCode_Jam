"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import type { Task } from "@/lib/api-client"

interface TaskPanelProps {
  task: Task | null
  taskNumber: number
  totalTasks: number
  loading?: boolean
}

export function TaskPanel({ task, taskNumber, totalTasks, loading }: TaskPanelProps) {

  const difficultyColors = {
    easy: "bg-success/20 text-success border-success/30",
    medium: "bg-warning/20 text-warning border-warning/30",
    hard: "bg-destructive/20 text-destructive border-destructive/30",
  }

  const taskTypeLabels = {
    algorithm: "Алгоритм",
    system_design: "Проектирование",
    code_review: "Code Review",
    debugging: "Отладка",
    practical: "Практика",
  }

  const showSkeleton = loading || !task

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardHeader className="flex-shrink-0 pb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              Задача {taskNumber}/{totalTasks}
            </Badge>
            {showSkeleton ? (
              <>
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-20" />
              </>
            ) : (
              <>
                <Badge className={difficultyColors[task!.difficulty]}>
                  {task!.difficulty === "easy" ? "Легко" : task!.difficulty === "medium" ? "Средне" : "Сложно"}
                </Badge>
                <Badge variant="secondary">{taskTypeLabels[task!.task_type]}</Badge>
              </>
            )}
          </div>

        </div>

        <CardTitle className="text-lg">
          {showSkeleton ? <Skeleton className="h-6 w-48" /> : task?.title}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto space-y-4">
        {showSkeleton ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <>
            <div>
              <h4 className="text-sm font-medium mb-2">Описание</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{task?.description}</p>
            </div>

            {task?.examples && task.examples.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Примеры</h4>
                <div className="space-y-3">
                  {task.examples.map((example, i) => (
                    <div key={i} className="bg-secondary/30 rounded-lg p-3 font-mono text-sm">
                      <div className="mb-1">
                        <span className="text-muted-foreground">Вход: </span>
                        <span>{example.input}</span>
                      </div>
                      <div className="mb-1">
                        <span className="text-muted-foreground">Выход: </span>
                        <span>{example.output}</span>
                      </div>
                      {example.explanation && (
                        <div className="text-xs text-muted-foreground mt-2 font-sans">{example.explanation}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {task?.constraints && task.constraints.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Ограничения</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {task.constraints.map((constraint, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>{constraint}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="text-xs text-muted-foreground border-t pt-3">
              Лимит времени на задачу: {task?.time_limit_minutes} минут
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
