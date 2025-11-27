"use client"

interface ProgressBarProps {
  current: number
  total: number
  scores: number[]
}

export function ProgressBar({ current, total, scores }: ProgressBarProps) {
  const progress = ((current - 1) / total) * 100

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">
          Прогресс: {current - 1}/{total} задач
        </span>
        {scores.length > 0 && (
          <span className="text-sm text-muted-foreground">
            Средний балл: {Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)}%
          </span>
        )}
      </div>

      <div className="flex gap-1">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`h-2 flex-1 rounded-full transition-colors ${
              i < current - 1
                ? scores[i] >= 70
                  ? "bg-success"
                  : scores[i] >= 40
                    ? "bg-warning"
                    : "bg-destructive"
                : i === current - 1
                  ? "bg-primary animate-pulse"
                  : "bg-secondary"
            }`}
          />
        ))}
      </div>
    </div>
  )
}
