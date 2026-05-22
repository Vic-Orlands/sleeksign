"use client"

import * as React from "react"
import { XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function Sheet({
  open,
  onOpenChange,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}) {
  return (
    <SheetContext.Provider value={{ open, onOpenChange }}>
      {children}
    </SheetContext.Provider>
  )
}

const SheetContext = React.createContext<{
  open: boolean
  onOpenChange: (open: boolean) => void
} | null>(null)

function useSheet() {
  const context = React.useContext(SheetContext)
  if (!context) throw new Error("Sheet components must be used inside Sheet")
  return context
}

function SheetTrigger({ children }: { children: React.ReactNode }) {
  const { onOpenChange } = useSheet()
  return <span onClick={() => onOpenChange(true)}>{children}</span>
}

function SheetContent({
  className,
  children,
  hideCloseButton = false,
}: React.ComponentProps<"div"> & { hideCloseButton?: boolean }) {
  const { open, onOpenChange } = useSheet()

  return (
    <div
      data-state={open ? "open" : "closed"}
      className="fixed inset-0 z-50 pointer-events-none data-[state=open]:pointer-events-auto"
    >
      <button
        className="absolute inset-0 bg-black/35 opacity-0 backdrop-blur-[2px] transition-opacity duration-300 data-[state=open]:opacity-100"
        data-state={open ? "open" : "closed"}
        tabIndex={open ? 0 : -1}
        onClick={() => onOpenChange(false)}
      />
      <div
        data-slot="sheet-content"
        data-state={open ? "open" : "closed"}
        className={cn(
          "absolute left-0 top-0 h-full w-72 -translate-x-full border-r bg-background shadow-xl transition-transform duration-300 ease-out data-[state=open]:translate-x-0 motion-reduce:transition-none",
          className,
        )}
      >
        {hideCloseButton ? null : (
          <Button
            variant="ghost"
            size="icon-sm"
            className="absolute right-2 top-2"
            onClick={() => onOpenChange(false)}
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </Button>
        )}
        {children}
      </div>
    </div>
  )
}

function SheetTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return <h2 className={cn("text-base font-semibold", className)} {...props} />
}

export { Sheet, SheetContent, SheetTitle, SheetTrigger }
