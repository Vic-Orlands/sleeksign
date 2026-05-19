"use client"

import { MoonIcon, SunIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAppTheme } from "@/components/theme-provider"

function ThemeToggle({ showLabel = false, className }: { showLabel?: boolean; className?: string }) {
  const { theme, setTheme } = useAppTheme()
  const isDark = theme === "dark"

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
