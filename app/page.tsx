"use client"

import { useState, type ChangeEvent, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { InterviewScreen } from "@/components/interview/interview-screen"
import { Code2, Cpu, Database, Globe, Server } from "lucide-react"

type InterviewDirection = "frontend" | "backend" | "fullstack" | "data_science" | "devops"
type ProgrammingLanguage = "python" | "javascript" | "cpp"
type Difficulty = "easy" | "medium" | "hard"
type TaskLanguage = "ru" | "en"

const directions = [
  { value: "frontend", label: "Frontend", icon: Globe, description: "React, Vue, Angular, CSS" },
  { value: "backend", label: "Backend", icon: Server, description: "API, базы данных, серверы" },
  { value: "fullstack", label: "Fullstack", icon: Code2, description: "Frontend + Backend" },
  { value: "data_science", label: "Data Science", icon: Database, description: "ML, анализ данных" },
  { value: "devops", label: "DevOps", icon: Cpu, description: "CI/CD, инфраструктура" },
]

const languages = [
  { value: "python", label: "Python", icon: "🐍" },
  { value: "javascript", label: "JavaScript", icon: "🟨" },
  { value: "cpp", label: "C++", icon: "⚡" },
]

const taskLanguages = [
  { value: "ru", label: "Русский" },
  { value: "en", label: "English" },
]

export default function HomePage() {
  const [started, setStarted] = useState(false)
  type FormData = {
    candidate_name: string
    candidate_email: string
    direction: InterviewDirection
    language: ProgrammingLanguage
    difficulty: Difficulty
    task_language: TaskLanguage
    use_task_bank: boolean
  }

  const [formData, setFormData] = useState<FormData>({
    candidate_name: "",
    candidate_email: "",
    direction: "" as InterviewDirection,
    language: "" as ProgrammingLanguage,
    difficulty: "medium" as Difficulty,
    task_language: "ru" as TaskLanguage,
    use_task_bank: false,
  })

  const isValid = formData.candidate_name && formData.candidate_email && formData.direction && formData.language

  if (started && isValid) {
    return <InterviewScreen interviewData={formData} />
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">AI Interview Platform</CardTitle>
          <CardDescription>Техническое интервью с AI-интервьюером</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Personal Info */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Имя</Label>
              <Input
                id="name"
                placeholder="Иван Иванов"
                value={formData.candidate_name}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData((prev: FormData) => ({ ...prev, candidate_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="ivan@example.com"
                value={formData.candidate_email}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData((prev: FormData) => ({ ...prev, candidate_email: e.target.value }))}
              />
            </div>
          </div>

          {/* Direction Selection */}
          <div className="space-y-3">
            <Label>Направление</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {directions.map((dir) => (
                <button
                  key={dir.value}
                  type="button"
                  onClick={() => setFormData((prev: FormData) => ({ ...prev, direction: dir.value as InterviewDirection }))}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    formData.direction === dir.value
                      ? "border-primary bg-primary/5 ring-2 ring-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <dir.icon
                    className={`h-6 w-6 mb-2 ${formData.direction === dir.value ? "text-primary" : "text-muted-foreground"}`}
                  />
                  <div className="font-medium">{dir.label}</div>
                  <div className="text-xs text-muted-foreground">{dir.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Language Selection */}
          <div className="space-y-3">
            <Label>Язык программирования</Label>
            <div className="flex gap-3">
              {languages.map((lang) => (
                <button
                  key={lang.value}
                  type="button"
                  onClick={() => setFormData((prev: FormData) => ({ ...prev, language: lang.value as ProgrammingLanguage }))}
                  className={`flex-1 p-4 rounded-lg border text-center transition-all ${
                    formData.language === lang.value
                      ? "border-primary bg-primary/5 ring-2 ring-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="text-2xl mb-1">{lang.icon}</div>
                  <div className="font-medium">{lang.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div className="space-y-3">
            <Label>Уровень сложности</Label>
            <RadioGroup
              value={formData.difficulty}
              onValueChange={(value: string) => setFormData((prev: FormData) => ({ ...prev, difficulty: value as Difficulty }))}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="easy" id="easy" />
                <Label htmlFor="easy" className="text-success cursor-pointer">
                  Легкий
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="medium" id="medium" />
                <Label htmlFor="medium" className="text-warning cursor-pointer">
                  Средний
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="hard" id="hard" />
                <Label htmlFor="hard" className="text-destructive cursor-pointer">
                  Сложный
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Task language */}
          <div className="space-y-3">
            <Label>Язык заданий</Label>
            <div className="flex gap-3">
              {taskLanguages.map((lang) => (
                <button
                  key={lang.value}
                  type="button"
                  onClick={() => setFormData((prev: FormData) => ({ ...prev, task_language: lang.value as TaskLanguage }))}
                  className={`flex-1 p-3 rounded-lg border text-center transition-all ${
                    formData.task_language === lang.value
                      ? "border-primary bg-primary/5 ring-2 ring-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="font-medium">{lang.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {lang.value === "ru" ? "Описание и подсказки на русском" : "Description and hints in English"}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Use task bank */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="use_task_bank"
                checked={formData.use_task_bank}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData((prev: FormData) => ({ ...prev, use_task_bank: e.target.checked }))}
                className="h-4 w-4"
              />
              <Label htmlFor="use_task_bank" className="cursor-pointer">
                Использовать задачи из базы (вместо генерации)
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Если включено, будут использоваться задачи из банка задач вместо генерации AI
            </p>
          </div>

          {/* Start Button */}
          <Button className="w-full" size="lg" disabled={!isValid} onClick={() => setStarted(true)}>
            Начать интервью
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Интервью займёт около 60 минут. Убедитесь, что вас никто не будет отвлекать.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
