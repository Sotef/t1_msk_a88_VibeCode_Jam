"use client"

import Editor, { type OnMount, type Monaco, loader } from "@monaco-editor/react"
import { useRef, useState, useEffect } from "react"

// Настраиваем Monaco Editor для использования локальных файлов вместо CDN
if (typeof window !== "undefined") {
  loader.config({
    paths: {
      vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.51.0/min/vs",
    },
  })
}

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Play, Send, Lightbulb, Loader2, Terminal, BookOpen } from "lucide-react"
import type { ProgrammingLanguage, ExecutionResult } from "@/lib/api-client"
import { getDocumentation, formatDocAsMarkdown } from "@/lib/documentation"
import { DocumentationPanel } from "./documentation-panel"

interface CodeEditorProps {
  code: string
  onChange: (code: string) => void
  language: ProgrammingLanguage
  onRunTests: () => Promise<ExecutionResult | null>
  onSubmit: () => void
  onHint: () => void
  isLoading: boolean
  hintsRemaining: number
  testResults?: ExecutionResult | null
  onPaste?: (text: string) => void
  onCodeChange?: (oldCode: string, newCode: string) => void
  isBusy?: boolean
}

const languageMap: Record<ProgrammingLanguage, string> = {
  python: "python",
  javascript: "javascript",
  cpp: "cpp",
}

export function CodeEditor({
  code,
  onChange,
  language,
  onRunTests,
  onSubmit,
  onHint,
  isLoading,
  hintsRemaining,
  testResults,
  onPaste,
  onCodeChange,
  isBusy,
}: CodeEditorProps) {
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null)
  const monacoRef = useRef<Monaco | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [localTestResults, setLocalTestResults] = useState<ExecutionResult | null>(null)
  const [isThemeReady, setIsThemeReady] = useState(false)
  const [isDocPanelOpen, setIsDocPanelOpen] = useState(false)
  const previousCodeRef = useRef<string>(code)

  // Определяем тему ДО загрузки Editor с обработкой ошибок и таймаутом
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null
    let isMounted = true

    const initTheme = async () => {
      try {
        const monaco = await loader.init()
        if (!isMounted) return

        monaco.editor.defineTheme("interview-theme", {
          base: "vs-dark",
          inherit: true,
          rules: [
            { token: "", foreground: "d4d4d4" },
            { token: "comment", foreground: "6a9955" },
            { token: "keyword", foreground: "569cd6", fontStyle: "bold" },
            { token: "string", foreground: "ce9178" },
            { token: "number", foreground: "b5cea8" },
            { token: "type", foreground: "4ec9b0" },
            { token: "function", foreground: "dcdcaa" },
            { token: "variable", foreground: "9cdcfe" },
            { token: "operator", foreground: "d4d4d4" },
            { token: "delimiter", foreground: "d4d4d4" },
            { token: "identifier", foreground: "d4d4d4" },
          ],
          colors: {
            "editor.background": "#1a1a1a", // Темный фон
            "editor.foreground": "#d4d4d4", // Светлый текст
            "editor.lineHighlightBackground": "#2a2a2a",
            "editor.selectionBackground": "#264f78",
            "editorCursor.foreground": "#aeafad",
            "editorWhitespace.foreground": "#3e3e3e",
            "editorIndentGuide.activeBackground": "#707070",
            "editor.selectionHighlightBorder": "#add6ff",
            "editorLineNumber.foreground": "#858585",
            "editorLineNumber.activeForeground": "#c6c6c6",
            "editorWidget.background": "#252526",
            "editorSuggestWidget.background": "#252526",
            "editorSuggestWidget.selectedBackground": "#2a2d2e",
            "editorSuggestWidget.foreground": "#d4d4d4",
            "editorSuggestWidget.highlightForeground": "#569cd6",
            "editorBracketMatch.background": "#0e639c",
            "editorBracketMatch.border": "#0e639c",
          },
        })
        
        if (isMounted) {
          setIsThemeReady(true)
          if (timeoutId) {
            clearTimeout(timeoutId)
            timeoutId = null
          }
        }
      } catch (error) {
        console.error("Failed to initialize Monaco theme:", error)
        // Устанавливаем isThemeReady в true даже при ошибке, чтобы показать редактор
        if (isMounted) {
          setIsThemeReady(true)
          if (timeoutId) {
            clearTimeout(timeoutId)
            timeoutId = null
          }
        }
      }
    }

    // Таймаут на случай, если loader.init() зависнет
    timeoutId = setTimeout(() => {
      if (isMounted && !isThemeReady) {
        console.warn("Monaco theme initialization timeout, showing editor anyway")
        setIsThemeReady(true)
      }
    }, 3000) // 3 секунды максимум (уменьшено с 5)

    initTheme()

    return () => {
      isMounted = false
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
    }
  }, []) // Пустой массив зависимостей - выполняется только при монтировании
  
  // Обновляем previousCodeRef при изменении code извне
  useEffect(() => {
    previousCodeRef.current = code
  }, [code])

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco

    // Применяем тему (она уже определена)
    monaco.editor.setTheme("interview-theme")

    // Включаем IntelliSense
    editor.updateOptions({
      quickSuggestions: {
        other: true,
        comments: false,
        strings: true,
      },
      suggestOnTriggerCharacters: true,
      acceptSuggestionOnEnter: "on",
      tabCompletion: "on",
      wordBasedSuggestions: "matchingDocuments",
      suggestSelection: "first",
      snippetSuggestions: "top",
      parameterHints: { enabled: true },
      hover: { enabled: true },
      formatOnPaste: true,
      formatOnType: true,
    })

    // Кастомные автодополнения для Python (только ключевые слова, без шаблонов)
    if (language === "python") {
      monaco.languages.registerCompletionItemProvider("python", {
        provideCompletionItems: () => {
          return {
            suggestions: [
              {
                label: "for",
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: "for",
                documentation: "Цикл for",
              },
              {
                label: "if",
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: "if",
                documentation: "Условный оператор if",
              },
              {
                label: "def",
                kind: monaco.languages.CompletionItemKind.Function,
                insertText: "def",
                documentation: "Определение функции",
              },
              {
                label: "class",
                kind: monaco.languages.CompletionItemKind.Class,
                insertText: "class",
                documentation: "Определение класса",
              },
              {
                label: "while",
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: "while",
                documentation: "Цикл while",
              },
              {
                label: "try",
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: "try",
                documentation: "Блок try-except",
              },
              {
                label: "with",
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: "with",
                documentation: "Контекстный менеджер",
              },
              {
                label: "return",
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: "return",
                documentation: "Возврат значения",
              },
            ],
          }
        },
      })
    }

    // Кастомные автодополнения для JavaScript (только ключевые слова, без шаблонов)
    if (language === "javascript") {
      monaco.languages.registerCompletionItemProvider("javascript", {
        provideCompletionItems: () => {
          return {
            suggestions: [
              {
                label: "for",
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: "for",
                documentation: "Цикл for",
              },
              {
                label: "function",
                kind: monaco.languages.CompletionItemKind.Function,
                insertText: "function",
                documentation: "Определение функции",
              },
              {
                label: "if",
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: "if",
                documentation: "Условный оператор if",
              },
              {
                label: "const",
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: "const",
                documentation: "Константа",
              },
              {
                label: "let",
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: "let",
                documentation: "Переменная let",
              },
              {
                label: "var",
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: "var",
                documentation: "Переменная var",
              },
            ],
          }
        },
      })
    }

    // Кастомные автодополнения для C++ (только ключевые слова, без шаблонов)
    if (language === "cpp") {
      monaco.languages.registerCompletionItemProvider("cpp", {
        provideCompletionItems: () => {
          return {
            suggestions: [
              {
                label: "for",
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: "for",
                documentation: "Цикл for",
              },
              {
                label: "if",
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: "if",
                documentation: "Условный оператор if",
              },
              {
                label: "while",
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: "while",
                documentation: "Цикл while",
              },
              {
                label: "int",
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: "int",
                documentation: "Тип int",
              },
              {
                label: "return",
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: "return",
                documentation: "Возврат значения",
              },
            ],
          }
        },
      })
    }

    // Регистрируем Hover Provider и Signature Help Provider
    const langMap: Record<ProgrammingLanguage, "python" | "javascript" | "cpp"> = {
      python: "python",
      javascript: "javascript",
      cpp: "cpp",
    }
    const docLang = langMap[language]

    // Hover Provider
    monaco.languages.registerHoverProvider(languageMap[language], {
      provideHover: (model, position) => {
        const word = model.getWordAtPosition(position)
        if (!word) return null

        // Пробуем найти документацию по имени функции
        let doc = getDocumentation(docLang, word.word)
        
        // Для JavaScript проверяем методы с точками (например, Array.map)
        if (!doc && language === "javascript") {
          const lineText = model.getLineContent(position.lineNumber)
          const beforeWord = lineText.substring(0, word.startColumn - 1).trim()
          
          // Проверяем паттерны: Array.method, Object.method, JSON.method
          const methodMatch = beforeWord.match(/(Array|Object|JSON)\.$/)
          if (methodMatch) {
            const fullName = `${methodMatch[1]}.${word.word}`
            doc = getDocumentation(docLang, fullName)
            if (doc) {
              const markdown = formatDocAsMarkdown(doc)
              return {
                range: new monaco.Range(
                  position.lineNumber,
                  word.startColumn,
                  position.lineNumber,
                  word.endColumn
                ),
                contents: [{ value: markdown }],
              }
            }
          }
        }

        if (doc) {
          const markdown = formatDocAsMarkdown(doc)
          return {
            range: new monaco.Range(
              position.lineNumber,
              word.startColumn,
              position.lineNumber,
              word.endColumn
            ),
            contents: [{ value: markdown }],
          }
        }
        return null
      },
    })

    // Signature Help Provider
    monaco.languages.registerSignatureHelpProvider(languageMap[language], {
      signatureHelpTriggerCharacters: ["("],
      provideSignatureHelp: (model, position) => {
        const textUntilPosition = model.getValueInRange({
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        })

        // Простой парсинг для определения функции
        let match = textUntilPosition.match(/(\w+)\s*\($/)
        let funcName = match ? match[1] : null
        
        // Для JavaScript проверяем методы с точками (например, Array.map(, Object.keys()
        if (!funcName && language === "javascript") {
          match = textUntilPosition.match(/(Array|Object|JSON)\.(\w+)\s*\($/)
          if (match) {
            funcName = `${match[1]}.${match[2]}`
          }
        }
        
        if (!funcName) return null

        const doc = getDocumentation(docLang, funcName)
        if (!doc) return null

        const signatureInfo: monaco.languages.SignatureInformation = {
          label: doc.signature,
          documentation: { value: doc.description },
          parameters: doc.parameters.map((param) => ({
            label: `${param.name}: ${param.type}`,
            documentation: param.description,
          })),
        }

        return {
          signatures: [signatureInfo],
          activeSignature: 0,
          activeParameter: 0,
        }
      },
    })

    editor.onDidPaste((event) => {
      if (!onPaste) return
      const text = editor.getModel()?.getValueInRange(event.range)
      if (text) onPaste(text)
    })
  }

  const handleRunTests = async () => {
    setIsRunning(true)
    setLocalTestResults(null)
    try {
      const results = await onRunTests()
      if (results) {
        setLocalTestResults(results)
      }
    } catch (error) {
      console.error("Error running tests:", error)
      setLocalTestResults({
        success: false,
        error: "Ошибка при выполнении тестов",
        test_results: [],
      })
    } finally {
      setIsRunning(false)
    }
  }

  const displayedResults = testResults || localTestResults

  return (
    <div className="flex h-full flex-col bg-card rounded-lg border overflow-hidden relative">
      {/* Визуальный индикатор загрузки - не блокирует редактирование */}
      {isBusy && (
        <div className="absolute inset-0 z-10 bg-background/30 backdrop-blur-[1px] pointer-events-none">
          <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-muted/20 to-transparent" />
        </div>
      )}
      <div className="flex items-center justify-between border-b px-4 py-2 bg-secondary/30">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-destructive/60" />
            <div className="h-3 w-3 rounded-full bg-warning/60" />
            <div className="h-3 w-3 rounded-full bg-success/60" />
          </div>
          <span className="ml-2 text-sm text-muted-foreground font-mono">
            solution.{language === "python" ? "py" : language === "javascript" ? "js" : "cpp"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDocPanelOpen(!isDocPanelOpen)}
            title="Открыть документацию"
          >
            <BookOpen className="h-4 w-4" />
          </Button>
          <Select value={language} disabled>
            <SelectTrigger className="w-32 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="python">Python</SelectItem>
              <SelectItem value="javascript">JavaScript</SelectItem>
              <SelectItem value="cpp">C++</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {/* Панель документации - теперь плавающее модальное окно */}
        <DocumentationPanel
          language={language}
          isOpen={isDocPanelOpen}
          onClose={() => setIsDocPanelOpen(false)}
        />
        {!isThemeReady ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-2">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Загрузка редактора...</p>
            </div>
          </div>
        ) : (
          <Editor
            value={code}
            onChange={(value) => {
              const newCode = value ?? ""
              const oldCode = previousCodeRef.current
              if (onCodeChange && oldCode !== newCode) {
                onCodeChange(oldCode, newCode)
              }
              previousCodeRef.current = newCode
              onChange(newCode)
            }}
            language={languageMap[language]}
            theme="interview-theme"
            onMount={handleMount}
            options={{
              minimap: { enabled: false },
              automaticLayout: true,
              fontSize: 14,
              lineNumbers: "on",
              wordWrap: "on",
              scrollBeyondLastLine: false,
              tabSize: 4,
              fontLigatures: true,
              readOnly: false, // Явно разрешаем редактирование
              // IntelliSense настройки
              quickSuggestions: {
                other: true,
                comments: false,
                strings: true,
              },
              suggestOnTriggerCharacters: true,
              acceptSuggestionOnEnter: "on",
              tabCompletion: "on",
              wordBasedSuggestions: "matchingDocuments",
              suggestSelection: "first",
              snippetSuggestions: "top",
              parameterHints: { enabled: true },
              hover: { enabled: true },
              formatOnPaste: true,
              formatOnType: true,
            }}
            height="100%"
          />
        )}
      </div>

      {/* Терминал для результатов тестов */}
      {(isRunning || displayedResults || localTestResults) && (
        <div className="border-t bg-black text-white flex flex-col h-64">
          <div className="flex items-center justify-between border-b border-gray-700 px-4 py-2">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-green-400" />
              <span className="text-sm font-mono text-gray-300">Тесты</span>
            </div>
            {isRunning && (
              <Button variant="destructive" size="sm" onClick={() => setIsRunning(false)}>
                Остановить
              </Button>
            )}
          </div>
          <ScrollArea className="flex-1 p-3 font-mono text-xs text-gray-200">
            {isRunning && !displayedResults && (
              <div className="text-green-400">Запуск тестов...</div>
            )}
            {displayedResults && (
              <>
                <div className={`mb-2 ${displayedResults.success ? "text-green-400" : "text-red-400"}`}>
                  {displayedResults.success ? "✓ Все тесты пройдены" : "✗ Некоторые тесты не пройдены"}
                </div>
                {displayedResults.test_results?.map((test, i) => (
                  <div key={i} className="mb-2">
                    <div className="flex items-center gap-2">
                      <span className={test.passed ? "text-green-400" : "text-red-400"}>
                        {test.passed ? "✓" : "✗"} Тест {test.test_number}
                      </span>
                      <span className="text-gray-400">({test.execution_time_ms}ms)</span>
                    </div>
                    {!test.passed && (
                      <div className="ml-4 mt-1 text-gray-300 text-xs">
                        <div>Вход: {test.input}</div>
                        <div>Ожидалось: {test.expected}</div>
                        <div>Получено: {test.actual}</div>
                        {test.error && <div className="text-red-400">Ошибка: {test.error}</div>}
                      </div>
                    )}
                  </div>
                ))}
                {displayedResults.error && !displayedResults.test_results && (
                  <div className="text-red-400">{displayedResults.error}</div>
                )}
                {displayedResults.feedback && (
                  <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded text-sm text-blue-300">
                    <div className="font-semibold mb-1">💡 Что можно улучшить:</div>
                    <div>{displayedResults.feedback}</div>
                  </div>
                )}
              </>
            )}
            {localTestResults && !displayedResults && (
              <div className="text-gray-300 whitespace-pre-wrap">
                {localTestResults.output || localTestResults.error || "Выполнение..."}
              </div>
            )}
          </ScrollArea>
        </div>
      )}

      <div className="flex items-center justify-between border-t px-4 py-2 bg-secondary/30">
        <Button variant="outline" size="sm" onClick={onHint} disabled={isLoading || hintsRemaining <= 0}>
          <Lightbulb className="mr-1.5 h-4 w-4" />
          Подсказка ({hintsRemaining})
        </Button>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRunTests} disabled={isLoading || isRunning}>
            {isRunning ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Play className="mr-1.5 h-4 w-4" />}
            Тесты
          </Button>

          <Button size="sm" onClick={onSubmit} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}
            Отправить
          </Button>
        </div>
      </div>

    </div>
  )
}
