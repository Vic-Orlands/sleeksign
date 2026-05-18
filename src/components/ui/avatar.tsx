import * as React from "react"
import Image from "next/image"

import { cn } from "@/lib/utils"

function Avatar({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="avatar"
      className={cn("relative flex size-8 shrink-0 overflow-hidden rounded-full", className)}
      {...props}
    />
  )
}

type AvatarImageProps = Omit<React.ComponentProps<typeof Image>, "src" | "alt"> & {
  src?: string
  alt?: string
}

function AvatarImage({ className, alt = "", src, ...props }: AvatarImageProps) {
  if (!src) return null

  return (
    <Image
      data-slot="avatar-image"
      alt={alt}
      src={src}
      fill
      sizes="32px"
      unoptimized
      className={cn("aspect-square size-full object-cover", className)}
      {...props}
    />
  )
}

function AvatarFallback({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="avatar-fallback"
      className={cn("flex size-full items-center justify-center rounded-full bg-muted text-xs font-medium", className)}
      {...props}
    />
  )
}

export { Avatar, AvatarFallback, AvatarImage }
