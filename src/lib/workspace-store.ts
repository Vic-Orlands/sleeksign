"use client"

import * as React from "react"

const WORKSPACE_STORAGE_KEY = "sleeksign:workspace-id"
const WORKSPACE_CHANGE_EVENT = "sleeksign-workspace-change"

function getWorkspaceSnapshot() {
  if (typeof window === "undefined") return ""
  return localStorage.getItem(WORKSPACE_STORAGE_KEY) || ""
}

function subscribeWorkspace(callback: () => void) {
  window.addEventListener("storage", callback)
  window.addEventListener(WORKSPACE_CHANGE_EVENT, callback)

  return () => {
    window.removeEventListener("storage", callback)
    window.removeEventListener(WORKSPACE_CHANGE_EVENT, callback)
  }
}

function setCurrentWorkspaceId(workspaceId: string) {
  if (workspaceId) {
    localStorage.setItem(WORKSPACE_STORAGE_KEY, workspaceId)
  } else {
    localStorage.removeItem(WORKSPACE_STORAGE_KEY)
  }

  window.dispatchEvent(new CustomEvent(WORKSPACE_CHANGE_EVENT, { detail: { workspaceId } }))
}

function useCurrentWorkspaceId() {
  return React.useSyncExternalStore(subscribeWorkspace, getWorkspaceSnapshot, () => "")
}

export { setCurrentWorkspaceId, useCurrentWorkspaceId }
