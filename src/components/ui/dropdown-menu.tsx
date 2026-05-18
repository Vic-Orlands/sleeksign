"use client"

import * as React from "react"
import { ChevronDownIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  return (
    <div ref={ref} className="relative" data-open={open}>
      <DropdownContext.Provider value={{ open, setOpen }}>{children}</DropdownContext.Provider>
    </div>
  )
}

const DropdownContext = React.createContext<{
  open: boolean
  setOpen: (open: boolean) => void
} | null>(null)

function useDropdown() {
  const context = React.useContext(DropdownContext)
  if (!context) throw new Error("DropdownMenu components must be used inside DropdownMenu")
  return context
}

function DropdownMenuTrigger({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const { open, setOpen } = useDropdown()
  return (
    <Button
      type="button"
      variant="outline"
      className={cn("justify-between", className)}
      aria-expanded={open}
      onClick={() => setOpen(!open)}
    >
      {children}
      <ChevronDownIcon data-icon="inline-end" />
    </Button>
  )
}

function DropdownMenuContent({ className, children }: React.ComponentProps<"div">) {
  const { open } = useDropdown()
  if (!open) return null

  return (
    <div
      data-slot="dropdown-menu-content"
      className={cn(
        "absolute right-0 top-[calc(100%+0.5rem)] z-50 min-w-48 rounded-lg border bg-popover p-1 text-popover-foreground shadow-xl",
        className
      )}
    >
      {children}
    </div>
  )
}

function DropdownMenuItem({
  className,
  onSelect,
  ...props
}: React.ComponentProps<"button"> & { onSelect?: () => void }) {
  const { setOpen } = useDropdown()
  return (
    <button
      type="button"
      data-slot="dropdown-menu-item"
      className={cn(
        "flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-sm outline-none hover:bg-muted",
        className
      )}
      onClick={(event) => {
        props.onClick?.(event)
        if (!event.defaultPrevented) {
          onSelect?.()
          setOpen(false)
        }
      }}
      {...props}
    />
  )
}

export { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger }
