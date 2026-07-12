import { browser } from "$app/environment";

const WORKSPACE_STORAGE_KEY = "sleeksign:workspace-id";
const TEAM_STORAGE_KEY = "sleeksign:team-id";
const WORKSPACE_CHANGE_EVENT = "sleeksign-workspace-change";

function readWorkspaceId() {
	if (!browser) return "";
	return localStorage.getItem(WORKSPACE_STORAGE_KEY) || "";
}

function readTeamId() {
	if (!browser) return "";
	return localStorage.getItem(TEAM_STORAGE_KEY) || "";
}

class WorkspaceStore {
	workspaceId = $state(readWorkspaceId());
	teamId = $state(readTeamId());

	constructor() {
		if (!browser) return;

		const sync = () => {
			this.workspaceId = readWorkspaceId();
			this.teamId = readTeamId();
		};

		window.addEventListener("storage", sync);
		window.addEventListener(WORKSPACE_CHANGE_EVENT, sync);
	}

	setWorkspaceId(workspaceId: string) {
		if (!browser) return;

		if (workspaceId) {
			localStorage.setItem(WORKSPACE_STORAGE_KEY, workspaceId);
		} else {
			localStorage.removeItem(WORKSPACE_STORAGE_KEY);
		}

		this.workspaceId = workspaceId;
		window.dispatchEvent(
			new CustomEvent(WORKSPACE_CHANGE_EVENT, { detail: { workspaceId } }),
		);
	}

	setTeamId(teamId: string) {
		if (!browser) return;

		if (teamId) {
			localStorage.setItem(TEAM_STORAGE_KEY, teamId);
		} else {
			localStorage.removeItem(TEAM_STORAGE_KEY);
		}

		this.teamId = teamId;
		window.dispatchEvent(new CustomEvent(WORKSPACE_CHANGE_EVENT, { detail: { teamId } }));
	}
}

export const workspaceStore = new WorkspaceStore();

export function setCurrentWorkspaceId(workspaceId: string) {
	workspaceStore.setWorkspaceId(workspaceId);
}

export function setCurrentTeamId(teamId: string) {
	workspaceStore.setTeamId(teamId);
}
