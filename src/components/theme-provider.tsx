"use client"

import * as React from "react"

type Theme = "dark" | "light"

const THEME_STORAGE_KEY = "sleeksign:theme"
const THEME_CHANGE_EVENT = "sleeksign-theme-change"

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "dark"
  return window.localStorage.getItem(THEME_STORAGE_KEY) === "light" ? "light" : "dark"
}

function subscribeTheme(callback: () => void) {
  window.addEventListener("storage", callback)
  window.addEventListener(THEME_CHANGE_EVENT, callback)

  return () => {
    window.removeEventListener("storage", callback)
    window.removeEventListener(THEME_CHANGE_EVENT, callback)
  }
}

function useAppTheme() {
  const theme = React.useSyncExternalStore(subscribeTheme, getStoredTheme, () => "dark")

  function setTheme(nextTheme: Theme) {
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT))
  }

  return { theme, setTheme }
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useAppTheme()

  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
  }, [theme])

  return children
}

export { ThemeProvider, useAppTheme }
