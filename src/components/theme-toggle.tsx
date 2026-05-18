"use client"

import { MoonIcon, SunIcon } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

function ThemeToggle({ showLabel = false, className }: { showLabel?: boolean; className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  return (
    <Button
      variant="outline"
      size={showLabel ? "sm" : "icon"}
      className={className}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Toggle theme"
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
      {showLabel ? <span>{isDark ? "Light Mode" : "Dark Mode"}</span> : null}
    </Button>
  )
}

export { ThemeToggle }
