export const SITE_NAME = "SleekSign";
export const SITE_TITLE = "SleekSign | Visual document signing workflows";
export const SITE_DESCRIPTION =
	"Map document signing workflows, assign signer roles, collect secure signatures, and keep an audit-ready trail in one workspace.";
export const SOCIAL_IMAGE_PATH = "/social/sleeksign-share-card.png";
export const SOCIAL_IMAGE_ALT =
	"A signed document moving through a clear, verified multi-signer workflow in SleekSign.";

type SeoMetadata = {
	title: string;
	description: string;
	index: boolean;
};

const privateMetadata = (title: string, description: string): SeoMetadata => ({
	title,
	description,
	index: false,
});

export function getSeoMetadata(pathname: string): SeoMetadata {
	if (pathname === "/") {
		return { title: SITE_TITLE, description: SITE_DESCRIPTION, index: true };
	}

	if (pathname === "/verify") {
		return {
			title: "Verify a signed document | SleekSign",
			description:
				"Verify the integrity of a SleekSign document against its signed audit receipt.",
			index: true,
		};
	}

	if (pathname.startsWith("/verify/")) {
		return privateMetadata(
			"Document verification | SleekSign",
			"Review the integrity receipt for a document finalized with SleekSign.",
		);
	}

	if (pathname === "/signin") {
		return privateMetadata("Sign in | SleekSign", "Sign in to your SleekSign workspace.");
	}

	if (pathname === "/signup") {
		return privateMetadata(
			"Create an account | SleekSign",
			"Create your SleekSign workspace.",
		);
	}

	if (pathname === "/forgot-password") {
		return privateMetadata(
			"Forgot password | SleekSign",
			"Request a secure SleekSign password reset link.",
		);
	}

	if (pathname.startsWith("/reset-password")) {
		return privateMetadata(
			"Reset password | SleekSign",
			"Set a new password for your SleekSign account.",
		);
	}

	if (pathname.startsWith("/accept-invitation/")) {
		return privateMetadata(
			"Accept invitation | SleekSign",
			"Accept an invitation to a SleekSign workspace.",
		);
	}

	if (pathname === "/auth/workspace") {
		return privateMetadata(
			"Choose workspace | SleekSign",
			"Choose the SleekSign workspace you want to open.",
		);
	}

	if (pathname.startsWith("/sign/")) {
		return privateMetadata(
			"Sign document | SleekSign",
			"Review and securely sign a document with SleekSign.",
		);
	}

	if (pathname.startsWith("/share/")) {
		return privateMetadata(
			"Shared document | SleekSign",
			"Open a document securely shared through SleekSign.",
		);
	}

	if (pathname === "/architecture" || pathname === "/codebase-scan") {
		return privateMetadata(
			"SleekSign architecture",
			"A living architecture map of the SleekSign codebase.",
		);
	}

	if (pathname.startsWith("/docs/")) {
		return privateMetadata(
			pathname.endsWith("/setup") ? "Set up document | SleekSign" : "Document | SleekSign",
			"Manage a document in your SleekSign workspace.",
		);
	}

	const workspacePages: Record<string, [string, string]> = {
		"/docs": ["Documents | SleekSign", "Manage documents in your SleekSign workspace."],
		"/shared": ["Shared documents | SleekSign", "Review documents shared with your workspace."],
		"/signed-docs": ["Signed documents | SleekSign", "Review completed documents and audit trails."],
		"/signers": ["Signers | SleekSign", "Manage signers and document recipients."],
		"/settings": ["Settings | SleekSign", "Manage your SleekSign workspace settings."],
	};
	const workspacePage = workspacePages[pathname];

	if (workspacePage) return privateMetadata(workspacePage[0], workspacePage[1]);

	return privateMetadata("SleekSign", SITE_DESCRIPTION);
}
