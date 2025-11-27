"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { X, Square } from "lucide-react"
import type { ExecutionResult } from "@/lib/api-client"

interface TestTerminalProps {
  executionResult: ExecutionResult | null
  isRunning: boolean
  onClose: () => void
  onStop?: () => void
}

export function TestTerminal({ executionResult, isRunning, onClose, onStop }: TestTerminalProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [output, setOutput] = useState<string>("")

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [output])

  useEffect(() => {
    if (executionResult) {
      let terminalOutput = ""
      
      if (executionResult.error) {
        terminalOutput += `\x1b[31mError: ${executionResult.error}\x1b[0m\n`
      }
      
      if (executionResult.output) {
        terminalOutput += executionResult.output
      }
      
      if (executionResult.test_results && executionResult.test_results.length > 0) {
        terminalOutput += "\n\n=== Test Results ===\n"
        executionResult.test_results.forEach((test, i) => {
          if (test.passed) {
            terminalOutput += `\x1b[32m✓ Test ${test.test_number}: PASSED\x1b[0m\n`
          } else {
            terminalOutput += `\x1b[31m✗ Test ${test.test_number}: FAILED\x1b[0m\n`
            if (test.input) terminalOutput += `  Input: ${test.input}\n`
            if (test.expected) terminalOutput += `  Expected: ${test.expected}\n`
            if (test.actual) terminalOutput += `  Actual: ${test.actual}\n`
            if (test.error) terminalOutput += `  Error: ${test.error}\n`
          }
          if (test.execution_time_ms) {
            terminalOutput += `  Time: ${test.execution_time_ms}ms\n`
          }
        })
      }
      
      if (executionResult.success !== undefined) {
        terminalOutput += `\n\n\x1b[${executionResult.success ? "32" : "31"}mOverall: ${executionResult.success ? "SUCCESS" : "FAILED"}\x1b[0m\n`
      }
      
      setOutput(terminalOutput)
    } else if (isRunning) {
      setOutput("Running tests...\n")
    } else {
      setOutput("")
    }
  }, [executionResult, isRunning])

  return (
    <Card className="fixed bottom-4 right-4 w-[600px] h-[400px] z-50 shadow-2xl">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-mono">Terminal</CardTitle>
        <div className="flex gap-2">
          {isRunning && onStop && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onStop}>
              <Square className="h-3 w-3" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea ref={scrollRef} className="h-[340px] w-full">
          <pre
            className="p-4 font-mono text-xs bg-[#1a1a1a] text-[#d4d4d4] h-full overflow-auto"
            style={{
              fontFamily: "Consolas, Monaco, 'Courier New', monospace",
            }}
          >
            {output || (isRunning ? "Running tests...\n" : "Ready.\n")}
            {isRunning && (
              <span className="animate-pulse inline-block w-2 h-4 bg-[#d4d4d4] ml-1">▋</span>
            )}
          </pre>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

