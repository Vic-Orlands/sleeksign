import type { Field } from "@/lib/field-utils"
import type { RoleConfig } from "@/lib/field-utils"

export type SessionStatus = "pending" | "completed"

export type SessionRecord = {
  id: string
  documentId: string
  status: SessionStatus
  finalizedFileUrl?: string | null
  signerName?: string | null
  signerEmail?: string | null
  signerRole?: string | null
  signerIp?: string | null
  signerUserAgent?: string | null
  completedAt?: string | number | Date | null
  deletedAt?: string | number | Date | null
  createdAt: string | number | Date
}

export type DocumentRecord = {
  id: string
  name: string
  fileUrl: string
  createdAt: string | number | Date
  archivedAt?: string | number | Date | null
  deletedAt?: string | number | Date | null
  isTemplate?: boolean
  signerRoles?: string[]
  roleConfigs?: RoleConfig[]
  fields?: Field[]
  sessions?: SessionRecord[]
}

export type DocumentStatus = "Pending" | "In Progress" | "Completed"
export type DocumentSetupStatus = "Needs Setup" | "Edited"

export function getDocumentType(name: string) {
  const lower = name.toLowerCase()
  if (lower.includes("nda")) return "NDA"
  if (lower.includes("offer")) return "Offer Letter"
  if (lower.includes("w-4") || lower.includes("tax")) return "Tax Form"
  if (lower.includes("handbook")) return "Acknowledgment"
  if (lower.includes("i-9") || lower.includes("eligibility")) return "Compliance"
  return "Document"
}

export function getDocumentStatus(document: DocumentRecord): DocumentStatus {
  const sessions = document.sessions || []
  if (sessions.length === 0) return "Pending"
  if (sessions.every((session) => session.status === "completed")) return "Completed"
  return "In Progress"
}

export function getDocumentSetupStatus(document: DocumentRecord): DocumentSetupStatus {
  return (document.fields?.length || 0) > 0 ? "Edited" : "Needs Setup"
}

export function getDocumentCounts(document: DocumentRecord) {
  const sessions = document.sessions || []
  const completed = sessions.filter((session) => session.status === "completed").length
  const pending = sessions.length - completed

  return {
    fields: document.fields?.length || 0,
    pending,
    completed,
    total: sessions.length,
  }
}

export function getInitials(name?: string | null) {
  if (!name) return "AK"
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}
