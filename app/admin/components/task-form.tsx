"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, XCircle, AlertCircle, ChevronRight, ChevronLeft } from "lucide-react"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

interface TaskFormData {
  description: string
  difficulty: "easy" | "medium" | "hard"
  task_type: "algorithm" | "system_design" | "code_review" | "debugging" | "practical"
  title: string
  direction: "backend" | "frontend" | "fullstack" | "data_science" | "devops"
  expected_solution: string
  examples: string
  constraints: string
  test_cases: string
  starter_code: string
  topic: string
  tags: string
  language: "python" | "javascript" | "cpp" | ""
}

interface ValidationError {
  field: string
  message: string
}

interface TaskFormProps {
  token: string
  onSuccess: () => void
  onCancel: () => void
}

const TASK_TEMPLATES: Record<string, Partial<TaskFormData>> = {
  algorithm: {
    task_type: "algorithm",
    examples: JSON.stringify([
      { input: "[1, 2, 3]", output: "6", explanation: "Сумма элементов" }
    ], null, 2),
    test_cases: JSON.stringify([
      { input: [1, 2, 3], expected: 6 },
      { input: [], expected: 0 },
      { input: [-1, 0, 1], expected: 0 }
    ], null, 2),
    constraints: JSON.stringify([
      "Временная сложность O(n)",
      "Пространственная сложность O(1)"
    ], null, 2),
  },
  system_design: {
    task_type: "system_design",
    examples: JSON.stringify([
      { input: "1000 пользователей", output: "Архитектура", explanation: "Масштабируемость" }
    ], null, 2),
  },
  code_review: {
    task_type: "code_review",
    examples: JSON.stringify([
      { input: "Код с багами", output: "Список проблем", explanation: "Анализ кода" }
    ], null, 2),
  },
}

export function TaskForm({ token, onSuccess, onCancel }: TaskFormProps) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<ValidationError[]>([])
  const [preview, setPreview] = useState<any>(null)
  
  const [formData, setFormData] = useState<TaskFormData>({
    description: "",
    difficulty: "medium",
    task_type: "algorithm",
    title: "",
    direction: "backend",
    expected_solution: "",
    examples: "",
    constraints: "",
    test_cases: "",
    starter_code: "",
    topic: "",
    tags: "",
    language: "",
  })

  const validateJSON = useCallback((value: string, fieldName: string): boolean => {
    if (!value.trim()) return true // Optional fields
    try {
      JSON.parse(value)
      return true
    } catch (e) {
      setErrors(prev => [...prev.filter(e => e.field !== fieldName), {
        field: fieldName,
        message: `Неверный JSON формат: ${e instanceof Error ? e.message : "Unknown error"}`
      }])
      return false
    }
  }, [])

  const validateStep = useCallback((stepNum: number): boolean => {
    const newErrors: ValidationError[] = []

    if (stepNum === 1) {
      if (!formData.description.trim()) {
        newErrors.push({ field: "description", message: "Условие задачи обязательно" })
      }
    }

    if (stepNum === 2) {
      // Validate JSON fields
      if (formData.examples && !validateJSON(formData.examples, "examples")) {
        return false
      }
      if (formData.constraints && !validateJSON(formData.constraints, "constraints")) {
        return false
      }
      if (formData.test_cases && !validateJSON(formData.test_cases, "test_cases")) {
        return false
      }
      if (formData.starter_code && !validateJSON(formData.starter_code, "starter_code")) {
        return false
      }
      if (formData.tags && !validateJSON(formData.tags, "tags")) {
        return false
      }
    }

    setErrors(newErrors)
    return newErrors.length === 0
  }, [formData, validateJSON])

  const handleNext = () => {
    if (validateStep(step)) {
      if (step === 2) {
        generatePreview()
      }
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    setStep(step - 1)
    setErrors([])
  }

  const generatePreview = () => {
    try {
      const previewData: any = {
        title: formData.title || "Без названия",
        description: formData.description,
        task_type: formData.task_type,
        difficulty: formData.difficulty,
        direction: formData.direction,
      }

      if (formData.examples) {
        previewData.examples = JSON.parse(formData.examples)
      }
      if (formData.constraints) {
        previewData.constraints = JSON.parse(formData.constraints)
      }
      if (formData.test_cases) {
        previewData.test_cases = JSON.parse(formData.test_cases)
      }
      if (formData.starter_code) {
        previewData.starter_code = JSON.parse(formData.starter_code)
      }
      if (formData.tags) {
        previewData.tags = JSON.parse(formData.tags)
      }
      if (formData.topic) {
        previewData.topic = formData.topic
      }
      if (formData.language) {
        previewData.language = formData.language
      }
      if (formData.expected_solution) {
        previewData.expected_solution = formData.expected_solution
      }

      setPreview(previewData)
    } catch (e) {
      console.error("Preview generation error:", e)
    }
  }

  const applyTemplate = (templateKey: string) => {
    const template = TASK_TEMPLATES[templateKey]
    if (template) {
      setFormData(prev => ({ ...prev, ...template }))
    }
  }

  const handleSubmit = async () => {
    if (!validateStep(2)) return

    setLoading(true)
    const formDataToSend = new FormData()
    formDataToSend.append("description", formData.description)
    formDataToSend.append("difficulty", formData.difficulty)
    formDataToSend.append("task_type", formData.task_type)
    if (formData.title) formDataToSend.append("title", formData.title)
    if (formData.direction) formDataToSend.append("direction", formData.direction)
    if (formData.expected_solution) formDataToSend.append("expected_solution", formData.expected_solution)
    if (formData.examples) formDataToSend.append("examples", formData.examples)
    if (formData.constraints) formDataToSend.append("constraints", formData.constraints)
    if (formData.test_cases) formDataToSend.append("test_cases", formData.test_cases)
    if (formData.starter_code) formDataToSend.append("starter_code", formData.starter_code)
    if (formData.topic) formDataToSend.append("topic", formData.topic)
    if (formData.tags) formDataToSend.append("tags", formData.tags)
    if (formData.language) formDataToSend.append("language", formData.language)

    try {
      const res = await fetch(`${API_BASE}/api/admin/task-bank/single`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formDataToSend,
      })

      if (res.ok) {
        onSuccess()
      } else {
        const errorText = await res.text()
        setErrors([{ field: "submit", message: `Ошибка: ${res.status} ${errorText}` }])
      }
    } catch (error) {
      setErrors([{ field: "submit", message: `Ошибка сети: ${error instanceof Error ? error.message : "Unknown"}` }])
    } finally {
      setLoading(false)
    }
  }

  const getFieldError = (fieldName: string) => {
    return errors.find(e => e.field === fieldName)?.message
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Добавить задачу</CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline">Шаг {step} из 3</Badge>
            <Button variant="ghost" size="sm" onClick={onCancel}>Отмена</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label>Условие задачи *</Label>
              <Textarea
                className="min-h-[150px] font-mono text-sm"
                value={formData.description}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, description: e.target.value }))
                  setErrors(prev => prev.filter(e => e.field !== "description"))
                }}
                placeholder="Подробное описание задачи..."
                required
              />
              {getFieldError("description") && (
                <Alert variant="destructive" className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{getFieldError("description")}</AlertDescription>
                </Alert>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Сложность *</Label>
                <Select
                  value={formData.difficulty}
                  onValueChange={(v: "easy" | "medium" | "hard") =>
                    setFormData(prev => ({ ...prev, difficulty: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Легко</SelectItem>
                    <SelectItem value="medium">Средне</SelectItem>
                    <SelectItem value="hard">Сложно</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Тип задачи *</Label>
                <Select
                  value={formData.task_type}
                  onValueChange={(v: TaskFormData["task_type"]) => {
                    setFormData(prev => ({ ...prev, task_type: v }))
                    applyTemplate(v)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="algorithm">Алгоритм</SelectItem>
                    <SelectItem value="system_design">Проектирование</SelectItem>
                    <SelectItem value="code_review">Code Review</SelectItem>
                    <SelectItem value="debugging">Отладка</SelectItem>
                    <SelectItem value="practical">Практика</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Название</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Краткое название задачи"
                />
              </div>
              <div>
                <Label>Направление</Label>
                <Select
                  value={formData.direction}
                  onValueChange={(v: TaskFormData["direction"]) =>
                    setFormData(prev => ({ ...prev, direction: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="backend">Backend</SelectItem>
                    <SelectItem value="frontend">Frontend</SelectItem>
                    <SelectItem value="fullstack">Fullstack</SelectItem>
                    <SelectItem value="data_science">Data Science</SelectItem>
                    <SelectItem value="devops">DevOps</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleNext} disabled={!formData.description.trim()}>
                Далее <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Advanced Fields */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <Label>Примеры (JSON)</Label>
              <Textarea
                className="min-h-[100px] font-mono text-sm"
                value={formData.examples}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, examples: e.target.value }))
                  setErrors(prev => prev.filter(e => e.field !== "examples"))
                  if (e.target.value.trim()) {
                    validateJSON(e.target.value, "examples")
                  }
                }}
                placeholder='[{"input": "1, 2, 3", "output": "6", "explanation": "Сумма"}]'
              />
              {getFieldError("examples") && (
                <Alert variant="destructive" className="mt-2">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>{getFieldError("examples")}</AlertDescription>
                </Alert>
              )}
              {formData.examples && !getFieldError("examples") && (
                <Alert className="mt-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>Валидный JSON</AlertDescription>
                </Alert>
              )}
            </div>

            <div>
              <Label>Ограничения (JSON массив)</Label>
              <Textarea
                className="min-h-[80px] font-mono text-sm"
                value={formData.constraints}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, constraints: e.target.value }))
                  setErrors(prev => prev.filter(e => e.field !== "constraints"))
                  if (e.target.value.trim()) {
                    validateJSON(e.target.value, "constraints")
                  }
                }}
                placeholder='["Временная сложность O(n)", "Не использовать встроенные функции"]'
              />
              {getFieldError("constraints") && (
                <Alert variant="destructive" className="mt-2">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>{getFieldError("constraints")}</AlertDescription>
                </Alert>
              )}
            </div>

            {formData.task_type === "algorithm" && (
              <div>
                <Label>Тест-кейсы (JSON) *</Label>
                <Textarea
                  className="min-h-[120px] font-mono text-sm"
                  value={formData.test_cases}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, test_cases: e.target.value }))
                    setErrors(prev => prev.filter(e => e.field !== "test_cases"))
                    if (e.target.value.trim()) {
                      validateJSON(e.target.value, "test_cases")
                    }
                  }}
                  placeholder='[{"input": [1, 2, 3], "expected": 6}, {"input": [], "expected": 0}]'
                />
                {getFieldError("test_cases") && (
                  <Alert variant="destructive" className="mt-2">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>{getFieldError("test_cases")}</AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            <div>
              <Label>Стартовый код (JSON объект)</Label>
              <Textarea
                className="min-h-[100px] font-mono text-sm"
                value={formData.starter_code}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, starter_code: e.target.value }))
                  setErrors(prev => prev.filter(e => e.field !== "starter_code"))
                  if (e.target.value.trim()) {
                    validateJSON(e.target.value, "starter_code")
                  }
                }}
                placeholder='{"python": "def solution():\\n    pass", "javascript": "function solution() {\\n}"}'
              />
              {getFieldError("starter_code") && (
                <Alert variant="destructive" className="mt-2">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>{getFieldError("starter_code")}</AlertDescription>
                </Alert>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Тема</Label>
                <Input
                  value={formData.topic}
                  onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
                  placeholder="массивы, графы, деревья"
                />
              </div>
              <div>
                <Label>Язык программирования</Label>
                <Select
                  value={formData.language}
                  onValueChange={(v: TaskFormData["language"]) =>
                    setFormData(prev => ({ ...prev, language: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Не указан" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Не указан</SelectItem>
                    <SelectItem value="python">Python</SelectItem>
                    <SelectItem value="javascript">JavaScript</SelectItem>
                    <SelectItem value="cpp">C++</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Теги (JSON массив)</Label>
              <Textarea
                className="min-h-[60px] font-mono text-sm"
                value={formData.tags}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, tags: e.target.value }))
                  setErrors(prev => prev.filter(e => e.field !== "tags"))
                  if (e.target.value.trim()) {
                    validateJSON(e.target.value, "tags")
                  }
                }}
                placeholder='["массивы", "сортировка", "O(n log n)"]'
              />
              {getFieldError("tags") && (
                <Alert variant="destructive" className="mt-2">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>{getFieldError("tags")}</AlertDescription>
                </Alert>
              )}
            </div>

            <div>
              <Label>Ожидаемое решение</Label>
              <Textarea
                className="min-h-[100px] font-mono text-sm"
                value={formData.expected_solution}
                onChange={(e) => setFormData(prev => ({ ...prev, expected_solution: e.target.value }))}
                placeholder="Опциональное решение задачи"
              />
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={handleBack}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Назад
              </Button>
              <Button onClick={handleNext} disabled={errors.length > 0}>
                Предпросмотр <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Preview & Submit */}
        {step === 3 && preview && (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Проверьте данные перед отправкой</AlertDescription>
            </Alert>

            <div className="border rounded-lg p-4 space-y-3">
              <div>
                <strong>Название:</strong> {preview.title}
              </div>
              <div>
                <strong>Тип:</strong> <Badge>{preview.task_type}</Badge>
                <strong className="ml-4">Сложность:</strong> <Badge>{preview.difficulty}</Badge>
                <strong className="ml-4">Направление:</strong> <Badge variant="outline">{preview.direction}</Badge>
              </div>
              <div>
                <strong>Описание:</strong>
                <div className="mt-2 p-3 bg-muted rounded text-sm whitespace-pre-wrap">
                  {preview.description}
                </div>
              </div>
              {preview.examples && (
                <div>
                  <strong>Примеры:</strong>
                  <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-auto">
                    {JSON.stringify(preview.examples, null, 2)}
                  </pre>
                </div>
              )}
              {preview.test_cases && (
                <div>
                  <strong>Тест-кейсы ({preview.test_cases.length}):</strong>
                  <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-auto">
                    {JSON.stringify(preview.test_cases, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {getFieldError("submit") && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{getFieldError("submit")}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={handleBack}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Назад
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? "Отправка..." : "Добавить задачу"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

