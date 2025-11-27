"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { X, Search, BookOpen } from "lucide-react"
import { getAvailableFunctions, getDocumentation, formatDocAsMarkdown, type FunctionDoc } from "@/lib/documentation"
import type { ProgrammingLanguage } from "@/lib/api-client"

interface DocumentationPanelProps {
  language: ProgrammingLanguage
  isOpen: boolean
  onClose: () => void
}

export function DocumentationPanel({ language, isOpen, onClose }: DocumentationPanelProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFunction, setSelectedFunction] = useState<string | null>(null)

  const langMap: Record<ProgrammingLanguage, "python" | "javascript" | "cpp"> = {
    python: "python",
    javascript: "javascript",
    cpp: "cpp",
  }

  const lang = langMap[language]
  const availableFunctions = getAvailableFunctions(lang)
  
  const filteredFunctions = availableFunctions.filter(func =>
    func.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedDoc = selectedFunction ? getDocumentation(lang, selectedFunction) : null

  if (!isOpen) return null

  return (
    <div className="fixed right-0 top-0 bottom-0 w-96 bg-card border-l shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3 bg-secondary/30">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          <h3 className="font-semibold">Документация</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск функций..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Function List */}
        <div className="w-1/2 border-r bg-muted/30">
          <ScrollArea className="h-full">
            <div className="p-2 space-y-1">
              {filteredFunctions.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  Функции не найдены
                </div>
              ) : (
                filteredFunctions.map((func) => (
                  <button
                    key={func}
                    onClick={() => setSelectedFunction(func)}
                    className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                      selectedFunction === func
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                  >
                    {func}
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Documentation Content */}
        <div className="w-1/2">
          <ScrollArea className="h-full">
            <div className="p-4">
              {selectedDoc ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-bold text-lg mb-2">{selectedDoc.signature}</h4>
                    <p className="text-sm text-muted-foreground mb-4">{selectedDoc.description}</p>
                  </div>

                  {selectedDoc.parameters.length > 0 && (
                    <div>
                      <h5 className="font-semibold mb-2">Параметры:</h5>
                      <ul className="space-y-2 text-sm">
                        {selectedDoc.parameters.map((param, i) => (
                          <li key={i} className="pl-4">
                            <code className="text-primary">{param.name}</code>
                            {param.optional && (
                              <span className="text-muted-foreground ml-1">(опционально)</span>
                            )}
                            <span className="text-muted-foreground ml-1">
                              : {param.type} - {param.description}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div>
                    <h5 className="font-semibold mb-2">Возвращает:</h5>
                    <p className="text-sm pl-4">
                      <code className="text-primary">{selectedDoc.returns.type}</code>
                      <span className="text-muted-foreground ml-2">
                        - {selectedDoc.returns.description}
                      </span>
                    </p>
                  </div>

                  {selectedDoc.examples.length > 0 && (
                    <div>
                      <h5 className="font-semibold mb-2">Примеры:</h5>
                      <div className="space-y-2">
                        {selectedDoc.examples.map((example, i) => (
                          <pre
                            key={i}
                            className="bg-muted p-3 rounded text-xs overflow-x-auto"
                          >
                            <code>{example}</code>
                          </pre>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Выберите функцию из списка</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}

