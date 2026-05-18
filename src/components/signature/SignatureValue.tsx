"use client";

import Image from "next/image";
import { decodeSignatureVector } from "@/lib/field-utils";
import { cn } from "@/lib/utils";

export function SignatureValue({
  value,
  className,
}: {
  value?: string;
  className?: string;
}) {
  const vector = decodeSignatureVector(value);

  if (vector) {
    return (
      <svg viewBox={vector.viewBox} className={className} aria-label={vector.name}>
        <path
          d={vector.pathData}
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.3"
        />
      </svg>
    );
  }

  if (value?.startsWith("data:image")) {
    return (
      <span className={cn("relative block h-full w-full", className)}>
        <Image src={value} alt="Signature" fill sizes="240px" unoptimized className="object-contain" />
      </span>
    );
  }

  return <span className={className}>{value}</span>;
}
