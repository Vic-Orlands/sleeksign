const WORKSPACE_STORAGE_KEY = "sleeksign:workspace-id";
const TEAM_STORAGE_KEY = "sleeksign:team-id";
const WORKSPACE_CHANGE_EVENT = "sleeksign-workspace-change";

function getWorkspaceSnapshot() {
	if (typeof window === "undefined") return "";
	return localStorage.getItem(WORKSPACE_STORAGE_KEY) || "";
}

function getTeamSnapshot() {
	if (typeof window === "undefined") return "";
	return localStorage.getItem(TEAM_STORAGE_KEY) || "";
}

function setCurrentWorkspaceId(workspaceId: string) {
	if (typeof window === "undefined") return;
	if (workspaceId) {
		localStorage.setItem(WORKSPACE_STORAGE_KEY, workspaceId);
	} else {
		localStorage.removeItem(WORKSPACE_STORAGE_KEY);
	}

	window.dispatchEvent(
		new CustomEvent(WORKSPACE_CHANGE_EVENT, { detail: { workspaceId } }),
	);
}

function setCurrentTeamId(teamId: string) {
	if (typeof window === "undefined") return;
	if (teamId) {
		localStorage.setItem(TEAM_STORAGE_KEY, teamId);
	} else {
		localStorage.removeItem(TEAM_STORAGE_KEY);
	}

	window.dispatchEvent(
		new CustomEvent(WORKSPACE_CHANGE_EVENT, { detail: { teamId } }),
	);
}

export {
	WORKSPACE_CHANGE_EVENT,
	getTeamSnapshot,
	getWorkspaceSnapshot,
	setCurrentTeamId,
	setCurrentWorkspaceId,
};
