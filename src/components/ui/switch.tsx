"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function Switch({
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
      role="switch"
      aria-checked={currentChecked}
      data-state={currentChecked ? "checked" : "unchecked"}
      data-slot="switch"
      className={cn(
        "inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent bg-input transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=checked]:bg-primary",
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
      <span
        data-slot="switch-thumb"
        className="pointer-events-none block size-4 rounded-full bg-background shadow-sm transition-transform data-[state=checked]:translate-x-4"
        data-state={currentChecked ? "checked" : "unchecked"}
      />
    </button>
  )
}

export { Switch }
