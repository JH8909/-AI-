"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  AlertTriangle,
  BarChart3,
  Bot,
  CheckCircle,
  FileText,
  LayoutDashboard,
  Package,
  Radar,
  Search,
  Settings,
  Star,
} from "lucide-react"

const navItems = [
  { href: "/", label: "仪表盘", icon: LayoutDashboard },
  { href: "/trend-candidates", label: "趋势候选池", icon: Search },
  { href: "/products", label: "产品池", icon: Package },
  { href: "/hot-radar", label: "爆品雷达", icon: Radar },
  { href: "/automation", label: "自动化任务", icon: Bot },
  { href: "/competitor-analysis", label: "竞品分析", icon: BarChart3 },
  { href: "/ai-scoring", label: "AI 评分", icon: Star },
  { href: "/content-drafts", label: "内容草稿", icon: FileText },
  { href: "/review-queue", label: "审核队列", icon: CheckCircle },
  { href: "/data-recap", label: "数据复盘", icon: AlertTriangle },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 border-r bg-card flex flex-col">
      {/* Logo */}
      <div className="flex h-14 items-center border-b px-4">
        <Package className="h-5 w-5 text-primary mr-2" />
        <span className="font-semibold text-sm">AI 选品中台</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 p-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t p-3">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
            pathname === "/settings" && "bg-primary/10 text-primary",
          )}
        >
          <Settings className="h-4 w-4" />
          设置
        </Link>
      </div>
    </aside>
  )
}
