"use client"

import * as React from "react"

const WORKSPACE_STORAGE_KEY = "sleeksign:workspace-id"
const TEAM_STORAGE_KEY = "sleeksign:team-id"
const WORKSPACE_CHANGE_EVENT = "sleeksign-workspace-change"

function getWorkspaceSnapshot() {
  if (typeof window === "undefined") return ""
  return localStorage.getItem(WORKSPACE_STORAGE_KEY) || ""
}

function getTeamSnapshot() {
  if (typeof window === "undefined") return ""
  return localStorage.getItem(TEAM_STORAGE_KEY) || ""
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

function setCurrentTeamId(teamId: string) {
  if (teamId) {
    localStorage.setItem(TEAM_STORAGE_KEY, teamId)
  } else {
    localStorage.removeItem(TEAM_STORAGE_KEY)
  }

  window.dispatchEvent(new CustomEvent(WORKSPACE_CHANGE_EVENT, { detail: { teamId } }))
}

function useCurrentWorkspaceId() {
  return React.useSyncExternalStore(subscribeWorkspace, getWorkspaceSnapshot, () => "")
}

function useCurrentTeamId() {
  return React.useSyncExternalStore(subscribeWorkspace, getTeamSnapshot, () => "")
}

export { setCurrentTeamId, setCurrentWorkspaceId, useCurrentTeamId, useCurrentWorkspaceId }
