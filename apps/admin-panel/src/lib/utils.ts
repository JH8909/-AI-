import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number | null): string {
  if (price === null || price === undefined) return "-"
  return `¥${price.toFixed(2)}`
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
}

export function scoreColor(score: number): string {
  if (score >= 8) return "text-green-600"
  if (score >= 6) return "text-yellow-600"
  return "text-red-600"
}

export function riskLabel(level: string): { label: string; color: string } {
  switch (level) {
    case "safe": return { label: "安全", color: "bg-green-100 text-green-700" }
    case "warning": return { label: "警告", color: "bg-yellow-100 text-yellow-700" }
    case "blocked": return { label: "已拦截", color: "bg-red-100 text-red-700" }
    default: return { label: level, color: "bg-gray-100 text-gray-700" }
  }
}
