"use client"

import * as React from "react"
import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Checkbox({
  className,
  checked,
  defaultChecked,
  onCheckedChange,
  ...props
}: Omit<React.ComponentProps<"button">, "onChange"> & {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
}) {
  const [internalChecked, setInternalChecked] = React.useState(Boolean(defaultChecked))
  const isControlled = checked !== undefined
  const currentChecked = isControlled ? checked : internalChecked

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={currentChecked}
      data-state={currentChecked ? "checked" : "unchecked"}
      data-slot="checkbox"
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input bg-background text-primary-foreground shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=checked]:border-primary data-[state=checked]:bg-primary disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      onClick={(event) => {
        props.onClick?.(event)
        if (event.defaultPrevented) return
        const next = !currentChecked
        if (!isControlled) setInternalChecked(next)
        onCheckedChange?.(next)
      }}
      {...props}
    >
      {currentChecked ? <CheckIcon className="size-3" /> : null}
    </button>
  )
}

export { Checkbox }
