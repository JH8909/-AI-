"use client"

import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <div>
          <h2 className="text-lg font-semibold">页面加载失败</h2>
          <p className="text-sm text-muted-foreground mt-1">{error.message || "未知错误"}</p>
        </div>
        <Button onClick={reset} variant="outline">重试</Button>
      </div>
    </div>
  )
}
