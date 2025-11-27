"use client"

import { useEffect, useCallback, useRef } from "react"
import { apiClient } from "@/lib/api-client"

interface AntiCheatConfig {
  interviewId: string
  enabled: boolean
}

export function useAntiCheat({ interviewId, enabled }: AntiCheatConfig) {
  const lastPasteLength = useRef(0)
  const tabSwitchCount = useRef(0)
  const pasteHistory = useRef<Array<{ text: string; timestamp: number }>>([])
  const codeChangeHistory = useRef<Array<{ timestamp: number; size: number; lines: number }>>([])

  const reportEvent = useCallback(
    async (eventType: string, details?: Record<string, unknown>) => {
      if (!enabled || !interviewId) return

      try {
        await apiClient.reportAntiCheatEvent(interviewId, eventType, details)
      } catch (error) {
        console.error("Failed to report anti-cheat event:", error)
      }
    },
    [interviewId, enabled],
  )

  useEffect(() => {
    if (!enabled) return

    // Tab switch detection
    const handleVisibilityChange = () => {
      if (document.hidden) {
        tabSwitchCount.current++
        reportEvent("tab_switch", { count: tabSwitchCount.current })
      }
    }

    // Focus loss detection
    const handleBlur = () => {
      reportEvent("focus_loss")
    }

    // Copy detection
    const handleCopy = () => {
      reportEvent("copy_paste", { action: "copy" })
    }

    // DevTools detection
    const checkDevTools = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > 160
      const heightThreshold = window.outerHeight - window.innerHeight > 160

      if (widthThreshold || heightThreshold) {
        reportEvent("devtools_open")
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("blur", handleBlur)
    document.addEventListener("copy", handleCopy)

    const devToolsInterval = setInterval(checkDevTools, 1000)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("blur", handleBlur)
      document.removeEventListener("copy", handleCopy)
      clearInterval(devToolsInterval)
    }
  }, [enabled, reportEvent])

  const checkPaste = useCallback(
    (text: string) => {
      const length = text.length
      const lineCount = (text.match(/\n/g) || []).length
      const hasCodeMarkers = /```|def |function |class |import |from |#include/.test(text)
      
      const details = {
        characters: length,
        lines: lineCount,
        has_code_markers: hasCodeMarkers,
        timestamp: Date.now()
      }
      
      if (length > 200) {
        lastPasteLength.current = length
        reportEvent("large_paste", details)
      } else if (length > 50 && hasCodeMarkers) {
        reportEvent("copy_paste", details)
      }
      
      // Отслеживание частоты вставок
      pasteHistory.current.push({ text, timestamp: Date.now() })
      const recentPastes = pasteHistory.current.filter(
        p => Date.now() - p.timestamp < 60000
      )
      if (recentPastes.length > 5) {
        reportEvent("frequent_paste", {
          count: recentPastes.length,
          time_window_ms: 60000
        })
      }
    },
    [reportEvent],
  )

  const trackCodeChange = useCallback(
    (oldCode: string, newCode: string) => {
      if (!enabled || !interviewId) return
      
      const diff = newCode.length - oldCode.length
      const oldLines = (oldCode.match(/\n/g) || []).length
      const newLines = (newCode.match(/\n/g) || []).length
      const linesDiff = newLines - oldLines
      
      const change = {
        timestamp: Date.now(),
        size: diff,
        lines: linesDiff
      }
      
      codeChangeHistory.current.push(change)
      
      // Отправляем каждые 10 изменений или каждые 30 секунд
      if (codeChangeHistory.current.length >= 10) {
        reportEvent("code_change_timestamp", {
          changes: codeChangeHistory.current.slice(-10)
        })
        codeChangeHistory.current = []
      }
      
      // Анализ больших изменений
      const recent = codeChangeHistory.current.filter(
        c => Date.now() - c.timestamp < 5000
      )
      const totalLines = recent.reduce((sum, c) => sum + Math.abs(c.lines), 0)
      
      if (totalLines > 50) {
        reportEvent("large_code_change", {
          lines: totalLines,
          time_window_ms: 5000,
          changes: recent
        })
      }
    },
    [enabled, interviewId, reportEvent],
  )

  // Мониторинг сетевой активности
  useEffect(() => {
    if (!enabled) return

    const suspiciousDomains = [
      'openai.com', 'anthropic.com', 'google.com/ai',
      'claude.ai', 'chatgpt.com', 'copilot.github.com',
      'zoom.us', 'teams.microsoft.com', 'meet.google.com',
      'discord.com', 'telegram.org'
    ]

    // Перехват fetch
    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      const url = args[0]?.toString() || ''
      const result = await originalFetch(...args)
      
      const isSuspicious = suspiciousDomains.some(domain => url.includes(domain))
      if (isSuspicious) {
        const serviceType = url.includes('zoom') || url.includes('teams') || url.includes('meet')
          ? 'call_service_request'
          : 'ai_service_request'
        
        reportEvent(serviceType, { url, method: 'fetch' })
      }
      
      return result
    }

    // Блокировка window.open
    const originalOpen = window.open
    window.open = function(...args) {
      const url = args[0]?.toString() || ''
      const isSuspicious = suspiciousDomains.some(domain => url.includes(domain))
      if (isSuspicious) {
        reportEvent("external_service_request", { url, method: "window.open" })
      }
      return null // Блокируем открытие
    }

    return () => {
      window.fetch = originalFetch
      window.open = originalOpen
    }
  }, [enabled, reportEvent])

  return { checkPaste, reportEvent, trackCodeChange }
}
