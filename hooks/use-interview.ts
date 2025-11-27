"use client"

import { useState, useCallback } from "react"
import {
  apiClient,
  type Task,
  type InterviewState,
  type ProgrammingLanguage,
  type ChatMessage,
  type TaskLanguage,
} from "@/lib/api-client"

type LoadingAction = "start" | "submit" | "tests" | "hint" | "nextTask" | "finish" | null

export function useInterview() {
  const [interview, setInterview] = useState<InterviewState | null>(null)
  const [currentTask, setCurrentTask] = useState<Task | null>(null)
  const [taskNumber, setTaskNumber] = useState(1)
  const [code, setCode] = useState("")
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [taskScores, setTaskScores] = useState<number[]>([])
  const [loadingAction, setLoadingAction] = useState<LoadingAction>(null)
  const [chatLoading, setChatLoading] = useState(false)
  const [isChatStreaming, setIsChatStreaming] = useState(false)

  const startInterview = useCallback(async (data: Parameters<typeof apiClient.startInterview>[0]) => {
    setIsLoading(true)
    setLoadingAction("start")
    try {
      const result = await apiClient.startInterview(data)
      setInterview(result)

      // Generate first task
      try {
        console.log("[use-interview] Generating first task...")
        const task = await apiClient.generateTask(result.interview_id, 1)
        console.log("[use-interview] Task received:", { 
          id: task?.id, 
          title: task?.title,
          hasDescription: !!task?.description 
        })
        if (task && task.id && task.title) {
          console.log("[use-interview] Setting current task")
          setCurrentTask(task)
          setCode(task.starter_code?.[data.language] || getDefaultCode(data.language))
        } else {
          console.error("[use-interview] Failed to generate task: task is null or invalid", task)
          // Устанавливаем дефолтный код, чтобы пользователь мог работать
          setCode(getDefaultCode(data.language))
        }
      } catch (error) {
        console.error("[use-interview] Error generating first task:", error)
        // Устанавливаем дефолтный код, чтобы пользователь мог работать
        setCode(getDefaultCode(data.language))
      }

      // Start with greeting message
      setChatMessages([
        {
          role: "assistant",
          content: getGreetingMessage(data.task_language),
        },
      ])

      return result
    } catch (error) {
      console.error("Error starting interview:", error)
      throw error
    } finally {
      // Гарантируем сброс состояния загрузки в любом случае
      setIsLoading(false)
      setLoadingAction(null)
    }
  }, [])

  const submitCode = useCallback(async () => {
    if (!interview || !currentTask) return null

    setIsLoading(true)
    setLoadingAction("submit")
    try {
      const result = await apiClient.submitCode(interview.interview_id, currentTask.id, code, interview.language)

      setTaskScores((prev: number[]) => [...prev, result.evaluation.score])

      return result
    } finally {
      setIsLoading(false)
      setLoadingAction(null)
    }
  }, [interview, currentTask, code])

  const runTests = useCallback(async () => {
    if (!interview || !currentTask) {
      console.error("Cannot run tests: interview or task is missing")
      return null
    }

    setIsLoading(true)
    setLoadingAction("tests")
    try {
      return await apiClient.runTests(interview.interview_id, currentTask.id, code, interview.language)
    } catch (error) {
      console.error("Error running tests:", error)
      return null
    } finally {
      setIsLoading(false)
      setLoadingAction(null)
    }
  }, [interview, currentTask, code])

  const getHint = useCallback(async () => {
    if (!interview || !currentTask) {
      console.error("Cannot get hint: interview or task is missing")
      return null
    }

    setIsLoading(true)
    setLoadingAction("hint")
    try {
      const result = await apiClient.getHint(interview.interview_id, currentTask.id, code)
      if (result) {
        setHintsUsed((prev: number) => prev + 1)
      }
      return result
    } catch (error) {
      console.error("Error getting hint:", error)
      return null
    } finally {
      setIsLoading(false)
      setLoadingAction(null)
    }
  }, [interview, currentTask, code])

  const nextTask = useCallback(async () => {
    if (!interview) return null

    const nextNum = taskNumber + 1
    if (nextNum > interview.total_tasks) {
      return null
    }

    setIsLoading(true)
    setLoadingAction("nextTask")
    try {
      const avgScore =
        taskScores.length > 0 ? taskScores.reduce((a: number, b: number) => a + b, 0) / taskScores.length : undefined

      console.log(`[use-interview] Generating next task ${nextNum}...`)
      const task = await apiClient.generateTask(interview.interview_id, nextNum, avgScore)
      console.log("[use-interview] Next task received:", { 
        id: task?.id, 
        title: task?.title,
        hasDescription: !!task?.description 
      })
      
      if (task && task.id && task.title) {
        console.log("[use-interview] Setting next task")
        setCurrentTask(task)
        setTaskNumber(nextNum)
        setCode(task.starter_code?.[interview.language] || getDefaultCode(interview.language))
        return task
      } else {
        console.error("[use-interview] Failed to generate task: task is null or invalid", task)
        // Устанавливаем дефолтный код, чтобы пользователь мог работать
        setCode(getDefaultCode(interview.language))
        return null
      }
    } catch (error) {
      console.error("Error generating next task:", error)
      // Устанавливаем дефолтный код, чтобы пользователь мог работать
      if (interview) {
        setCode(getDefaultCode(interview.language))
      }
      return null
    } finally {
      // Гарантируем сброс состояния загрузки в любом случае
      setIsLoading(false)
      setLoadingAction(null)
    }
  }, [interview, taskNumber, taskScores])

  const sendMessage = useCallback(
    async (message: string) => {
      if (!interview) return

      setChatMessages((prev: ChatMessage[]) => [...prev, { role: "user", content: message }])

      let assistantMessage = ""
      setChatMessages((prev: ChatMessage[]) => [...prev, { role: "assistant", content: "" }])
      setChatLoading(true)
      setIsChatStreaming(true)

      try {
        await apiClient.sendChatMessage(
          interview.interview_id,
          message,
          "softskills",
          (chunk) => {
            assistantMessage += chunk
            setChatMessages((prev: ChatMessage[]) => {
              const updated = [...prev]
              updated[updated.length - 1] = { role: "assistant", content: assistantMessage }
              return updated
            })
          },
          currentTask?.id,
        )
      } finally {
        setChatLoading(false)
        setIsChatStreaming(false)
      }
    },
    [interview, currentTask],
  )

  const finishInterview = useCallback(async () => {
    if (!interview) return null

    setIsLoading(true)
    setLoadingAction("finish")
    try {
      return await apiClient.finishInterview(interview.interview_id)
    } finally {
      setIsLoading(false)
      setLoadingAction(null)
    }
  }, [interview])

  return {
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
  }
}

function getDefaultCode(language: ProgrammingLanguage): string {
  switch (language) {
    case "python":
      return "# Напишите ваше решение здесь\n\ndef solution():\n    pass\n"
    case "javascript":
      return "// Напишите ваше решение здесь\n\nfunction solution() {\n  \n}\n"
    case "cpp":
      return "// Напишите ваше решение здесь\n\n#include <iostream>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}\n"
    default:
      return ""
  }
}

function getGreetingMessage(language: TaskLanguage): string {
  if (language === "en") {
    return "Hi! I'm your AI interviewer. Let's start with the first task. Feel free to ask me about the assignment or discuss your approach anytime."
  }
  return "Привет! Я буду вашим AI-интервьюером. Давайте начнем с первого задания. Если хотите уточнить формулировку или обсудить подход — просто напишите мне."
}
