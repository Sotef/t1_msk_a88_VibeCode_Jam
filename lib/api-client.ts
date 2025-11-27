const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export type ProgrammingLanguage = "python" | "javascript" | "cpp"
export type InterviewDirection = "frontend" | "backend" | "fullstack" | "data_science" | "devops"
export type Difficulty = "easy" | "medium" | "hard"
export type TaskLanguage = "ru" | "en"
export type TaskType = "algorithm" | "system_design" | "code_review" | "debugging" | "practical"

export interface Task {
  id: string
  title: string
  description: string
  task_type: TaskType
  difficulty: Difficulty
  examples: Array<{ input: string; output: string; explanation?: string }>
  constraints?: string[]
  time_limit_minutes: number
  starter_code?: Record<string, string>
}

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

export interface InterviewState {
  interview_id: string
  status: string
  current_task: number
  total_tasks: number
  direction: InterviewDirection
  language: ProgrammingLanguage
  task_language: TaskLanguage
  difficulty: Difficulty
  started_at: string
}

export interface CodeEvaluation {
  score: number
  feedback: string
  strengths: string[]
  improvements: string[]
  code_quality: number
  efficiency: number
  correctness: number
}

export interface TestResult {
  test_number: number
  passed: boolean
  input: string
  expected: string
  actual: string
  error?: string
  execution_time_ms: number
}

export interface ExecutionResult {
  success: boolean
  output?: string
  error?: string
  execution_time_ms: number
  memory_used_mb: number
  test_results?: TestResult[]
}

export const apiClient = {
  async startInterview(data: {
    candidate_name: string
    candidate_email: string
    direction: InterviewDirection
    language: ProgrammingLanguage
    difficulty: Difficulty
    task_language: TaskLanguage
    use_task_bank?: boolean
  }): Promise<InterviewState> {
    const res = await fetch(`${API_BASE}/api/interview/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error("Failed to start interview")
    return res.json()
  },

  async generateTask(interview_id: string, task_number: number, previous_performance?: number): Promise<Task> {
    console.log(`[API] Generating task ${task_number} for interview ${interview_id}`)
    const res = await fetch(`${API_BASE}/api/interview/generate-task`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interview_id, task_number, previous_performance }),
    })
    if (!res.ok) {
      const errorText = await res.text()
      console.error("[API] Failed to generate task:", res.status, errorText)
      throw new Error(`Failed to generate task: ${res.status} ${errorText}`)
    }
    const data = await res.json()
    console.log("[API] Task received:", { 
      id: data?.id, 
      title: data?.title, 
      hasDescription: !!data?.description,
      hasStarterCode: !!data?.starter_code 
    })
    if (!data) {
      console.error("[API] Empty response from generate task")
      throw new Error("Empty response from generate task")
    }
    // Проверяем минимальные требования для задачи
    if (!data.id || !data.title) {
      console.error("[API] Invalid task data:", data)
      throw new Error("Invalid task data: missing id or title")
    }
    return data
  },

  async submitCode(
    interview_id: string,
    task_id: string,
    code: string,
    language: ProgrammingLanguage,
  ): Promise<{
    task_id: string
    execution_result?: ExecutionResult
    evaluation: CodeEvaluation
    anti_cheat: { is_suspicious: boolean }
  }> {
    const res = await fetch(`${API_BASE}/api/interview/submit-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interview_id, task_id, code, language }),
    })
    if (!res.ok) throw new Error("Failed to submit code")
    return res.json()
  },

  async runTests(
    interview_id: string,
    task_id: string,
    code: string,
    language: ProgrammingLanguage,
  ): Promise<ExecutionResult> {
    const res = await fetch(`${API_BASE}/api/interview/run-tests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interview_id, task_id, code, language }),
    })
    if (!res.ok) throw new Error("Failed to run tests")
    return res.json()
  },

  async getHint(
    interview_id: string,
    task_id: string,
    code: string,
  ): Promise<{
    hint: string
    hint_number: number
    hints_remaining: number
  }> {
    const res = await fetch(`${API_BASE}/api/interview/hint`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interview_id, task_id, code }),
    })
    if (!res.ok) throw new Error("Failed to get hint")
    return res.json()
  },

  async sendChatMessage(
    interview_id: string,
    message: string,
    context: "softskills" | "task_discussion",
    onChunk: (chunk: string) => void,
    task_id?: string,
  ): Promise<void> {
    const res = await fetch(`${API_BASE}/api/interview/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interview_id, message, context, task_id }),
    })

    if (!res.ok) throw new Error("Failed to send message")

    const reader = res.body?.getReader()
    if (!reader) return

    const decoder = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const text = decoder.decode(value)
      const lines = text.split("\n")

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6)
          if (data === "[DONE]") break
          try {
            const parsed = JSON.parse(data)
            if (parsed.content) {
              onChunk(parsed.content)
            }
          } catch {}
        }
      }
    }
  },

  async reportAntiCheatEvent(
    interview_id: string,
    event_type: string,
    details?: Record<string, unknown>,
  ): Promise<void> {
    await fetch(`${API_BASE}/api/interview/anti-cheat-event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interview_id, event_type, details }),
    })
  },

  async finishInterview(interview_id: string): Promise<{ interview_id: string; status: string; assessment: unknown }> {
    const res = await fetch(`${API_BASE}/api/interview/finish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interview_id }),
    })
    if (!res.ok) throw new Error("Failed to finish interview")
    return res.json()
  },

  async getInterviewFeedback(interview_id: string) {
    const res = await fetch(`${API_BASE}/api/interview/feedback/${interview_id}`)
    if (!res.ok) throw new Error("Failed to get feedback")
    return res.json()
  },

  async getInterviewStatus(interview_id: string) {
    const res = await fetch(`${API_BASE}/api/interview/status/${interview_id}`)
    if (!res.ok) throw new Error("Failed to get status")
    return res.json()
  },
}
