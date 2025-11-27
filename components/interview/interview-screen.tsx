"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { CodeEditor } from "./code-editor"
import { TaskPanel } from "./task-panel"
import { ChatPanel } from "./chat-panel"
import { ProgressBar } from "./progress-bar"
import { FeedbackReport } from "./feedback-report"
import { useInterview } from "@/hooks/use-interview"
import { useAntiCheat } from "@/hooks/use-anti-cheat"
import { AlertTriangle, LogOut, Clock } from "lucide-react"
import {
  PanelGroup as ResizablePanelGroup,
  Panel as ResizablePanel,
  PanelResizeHandle as ResizableHandle,
} from "react-resizable-panels"

interface InterviewScreenProps {
  interviewData: {
    candidate_name: string
    candidate_email: string
    direction: "frontend" | "backend" | "fullstack" | "data_science" | "devops"
    language: "python" | "javascript" | "cpp"
    difficulty: "easy" | "medium" | "hard"
    task_language: "ru" | "en"
    use_task_bank?: boolean
  }
}

export function InterviewScreen({ interviewData }: InterviewScreenProps) {
  const {
    interview,
    currentTask,
    taskNumber,
    code,
    setCode,
    chatMessages,
    isLoading,
    hintsUsed,
    taskScores,
    startInterview,
    submitCode,
    runTests,
    getHint,
    nextTask,
    sendMessage,
    finishInterview,
    loadingAction,
    chatLoading,
    isChatStreaming,
  } = useInterview()

  const [timeRemaining, setTimeRemaining] = useState(3600) // 60 minutes
  const [showHintDialog, setShowHintDialog] = useState(false)
  const [currentHint, setCurrentHint] = useState("")
  const [hintsRemaining, setHintsRemaining] = useState(3)
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [lastEvaluation, setLastEvaluation] = useState<any>(null)
  const [showFinishDialog, setShowFinishDialog] = useState(false)
  const [feedback, setFeedback] = useState<any>(null)

  const { checkPaste, trackCodeChange } = useAntiCheat({
    interviewId: interview?.interview_id || "",
    enabled: !!interview,
  })

  // Start interview on mount
  useEffect(() => {
    startInterview({
      ...interviewData,
      use_task_bank: interviewData.use_task_bank || false,
    })
  }, [])

  // Timer
  useEffect(() => {
    if (!interview) return

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 0) {
          handleFinish()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [interview])

  const handleRunTests = useCallback(async () => {
    try {
      const result = await runTests()
      return result
    } catch (error) {
      console.error("Failed to run tests:", error)
      return null
    }
  }, [runTests])

  const handleSubmit = useCallback(async () => {
    const result = await submitCode()
    if (result) {
      setLastEvaluation(result.evaluation)
      setShowSubmitDialog(true)
    }
  }, [submitCode])

  const handleHint = useCallback(async () => {
    try {
      const result = await getHint()
      if (result) {
        setCurrentHint(result.hint)
        setHintsRemaining(result.hints_remaining)
        setShowHintDialog(true)
      }
    } catch (error) {
      console.error("Failed to get hint:", error)
    }
  }, [getHint])

  const handleNextTask = useCallback(async () => {
    setShowSubmitDialog(false)
    setHintsRemaining(3)
    const task = await nextTask()
    if (!task) {
      handleFinish()
    }
  }, [nextTask])

  const handleFinish = useCallback(async () => {
    setShowFinishDialog(false)
    setShowSubmitDialog(false)
    const result = await finishInterview()
    if (result && interview?.interview_id) {
      const feedbackData = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/interview/feedback/${interview.interview_id}`,
      )
      if (feedbackData.ok) {
        const fb = await feedbackData.json()
        setFeedback(fb)
      }
    }
  }, [finishInterview, interview])

  // Show feedback report
  if (feedback) {
    return <FeedbackReport feedback={feedback} />
  }

  const taskPanelLoading = !currentTask || loadingAction === "start" || loadingAction === "nextTask"
  const editorLoading = loadingAction === "submit" || loadingAction === "tests" || loadingAction === "hint"

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex-shrink-0 border-b bg-card px-6" style={{ paddingTop: '0.5625rem', paddingBottom: '0.5625rem' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <h1 className="text-lg font-semibold">AI Interview Platform</h1>
            <ProgressBar current={taskNumber} total={interview?.total_tasks || 5} scores={taskScores} />
          </div>

          <div className="flex items-center gap-4">
            <div
              className={`flex items-center gap-1.5 text-sm font-mono ${timeRemaining < 300 ? "text-destructive" : "text-muted-foreground"}`}
            >
              <Clock className="h-4 w-4" />
              {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, "0")}
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowFinishDialog(true)}>
              <LogOut className="h-4 w-4 mr-2" />
              Завершить
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          <ResizablePanel defaultSize={22} minSize={16}>
            <div className="h-full border-r p-4">
              <TaskPanel
                task={currentTask}
                taskNumber={taskNumber}
                totalTasks={interview?.total_tasks || 5}
                loading={taskPanelLoading}
              />
            </div>
          </ResizablePanel>
          <PanelHandle />
          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="h-full p-4">
              <CodeEditor
                code={code}
                onChange={setCode}
                language={interview?.language || "python"}
                onRunTests={handleRunTests}
                onSubmit={handleSubmit}
                onHint={handleHint}
                isLoading={isLoading}
                hintsRemaining={hintsRemaining}
                onPaste={checkPaste}
                onCodeChange={trackCodeChange}
                isBusy={editorLoading}
              />
            </div>
          </ResizablePanel>
          <PanelHandle />
          <ResizablePanel defaultSize={28} minSize={18}>
            <div className="h-full border-l p-4">
              <ChatPanel
                messages={chatMessages}
                onSendMessage={sendMessage}
                isLoading={chatLoading}
                isStreaming={isChatStreaming}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>

      {/* Hint Dialog */}
      <Dialog open={showHintDialog} onOpenChange={setShowHintDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Подсказка
            </DialogTitle>
            <DialogDescription>Использование подсказок влияет на итоговую оценку</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm">{currentHint}</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowHintDialog(false)}>Понятно</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit Result Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Результат проверки</DialogTitle>
          </DialogHeader>
          {lastEvaluation && (
            <div className="py-4 space-y-4">
              <div className="text-center">
                <div
                  className={`text-4xl font-bold ${
                    lastEvaluation.score >= 70
                      ? "text-success"
                      : lastEvaluation.score >= 40
                        ? "text-warning"
                        : "text-destructive"
                  }`}
                >
                  {Math.round(lastEvaluation.score)}%
                </div>
                <p className="text-sm text-muted-foreground mt-1">Оценка за задачу</p>
              </div>

              <p className="text-sm">{lastEvaluation.feedback}</p>

              {lastEvaluation.strengths?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Хорошо:</h4>
                  <ul className="text-sm text-muted-foreground">
                    {lastEvaluation.strengths.map((s: string, i: number) => (
                      <li key={i}>• {s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {lastEvaluation.improvements?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Можно улучшить:</h4>
                  <ul className="text-sm text-muted-foreground">
                    {lastEvaluation.improvements.map((s: string, i: number) => (
                      <li key={i}>• {s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {taskNumber < (interview?.total_tasks || 5) ? (
              <Button onClick={handleNextTask}>Следующая задача</Button>
            ) : (
              <Button onClick={handleFinish}>Завершить интервью</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Finish Confirmation Dialog */}
      <Dialog open={showFinishDialog} onOpenChange={setShowFinishDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Завершить интервью?</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите завершить интервью? Это действие нельзя отменить.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFinishDialog(false)}>
              Отмена
            </Button>
            <Button variant="destructive" onClick={handleFinish}>
              Завершить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PanelHandle() {
  return (
    <ResizableHandle className="bg-border/30 relative flex items-center justify-center w-2">
      <span className="h-10 w-0.5 rounded-full bg-border/80" />
    </ResizableHandle>
  )
}
