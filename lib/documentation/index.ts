/**
 * Централизованный экспорт документации для всех языков
 */

import { pythonDocs } from "./python"
import { javascriptDocs } from "./javascript"
import { cppDocs } from "./cpp"
import type { FunctionDoc } from "./python"

export type { FunctionDoc }

export const documentation = {
  python: pythonDocs,
  javascript: javascriptDocs,
  cpp: cppDocs,
}

/**
 * Преобразует документацию функции в Markdown для Monaco Editor
 */
export function formatDocAsMarkdown(doc: FunctionDoc): string {
  let markdown = `**${doc.signature}**\n\n`
  markdown += `${doc.description}\n\n`
  
  if (doc.parameters.length > 0) {
    markdown += `**Параметры:**\n`
    doc.parameters.forEach(param => {
      const optional = param.optional ? " (опционально)" : ""
      markdown += `- \`${param.name}\` (\`${param.type}\`)${optional}: ${param.description}\n`
    })
    markdown += `\n`
  }
  
  markdown += `**Возвращает:**\n`
  markdown += `- \`${doc.returns.type}\`: ${doc.returns.description}\n\n`
  
  if (doc.examples.length > 0) {
    markdown += `**Примеры:**\n`
    markdown += "```\n"
    doc.examples.forEach(example => {
      markdown += `${example}\n`
    })
    markdown += "```\n"
  }
  
  return markdown
}

/**
 * Получает документацию для функции по языку и имени
 */
export function getDocumentation(
  language: "python" | "javascript" | "cpp",
  functionName: string
): FunctionDoc | null {
  const docs = documentation[language]
  return docs[functionName] || null
}

/**
 * Получает все доступные функции для языка
 */
export function getAvailableFunctions(
  language: "python" | "javascript" | "cpp"
): string[] {
  return Object.keys(documentation[language])
}

