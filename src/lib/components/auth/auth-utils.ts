export type AuthMode = "signin" | "signup" | "forgot" | "reset";

export const authContent: Record<
	AuthMode,
	{ eyebrow: string; title: string; copy: string }
> = {
	signin: {
		eyebrow: "Welcome Back",
		title: "Sign in to your workspace",
		copy: "Continue managing uploads, signer activity, and completed documents.",
	},
	signup: {
		eyebrow: "Create Workspace",
		title: "Start your signing workspace",
		copy: "Set up your account and continue into the document dashboard.",
	},
	forgot: {
		eyebrow: "Password Recovery",
		title: "Send a reset link",
		copy: "Enter your email and SleekSign will send instructions to reset your password.",
	},
	reset: {
		eyebrow: "Reset Password",
		title: "Choose a new password",
		copy: "Enter a fresh password to regain access to your signing workspace.",
	},
};

export function appendNextPath(href: string, nextPath?: string) {
	if (!nextPath) return href;
	const separator = href.includes("?") ? "&" : "?";
	return `${href}${separator}next=${encodeURIComponent(nextPath)}`;
}

export function getWorkspaceRedirectPath(nextPath?: string) {
	return appendNextPath("/auth/workspace", nextPath);
}

export function getSubmitLabel(mode: AuthMode) {
	if (mode === "signup") return "Create Account";
	if (mode === "forgot") return "Send Reset Link";
	if (mode === "reset") return "Reset Password";
	return "Sign In";
}

export function getSubmitLoadingLabel(mode: AuthMode) {
	if (mode === "signup") return "Creating account...";
	if (mode === "forgot") return "Sending reset link...";
	if (mode === "reset") return "Resetting password...";
	return "Signing in...";
}

export function getSwitcherText(mode: AuthMode) {
	if (mode === "signup") return "Already have an account?";
	if (mode === "forgot" || mode === "reset") return "Remembered your password?";
	return "New to SleekSign?";
}

export function getSwitcherHref(mode: AuthMode) {
	if (mode === "signin") return "/signup";
	return "/signin";
}

export function getSwitcherAction(mode: AuthMode) {
	if (mode === "signin") return "Sign Up";
	return "Sign In";
}

export function getLastWorkspaceId(user: unknown) {
	if (!user || typeof user !== "object") return "";
	const value = (user as { lastWorkspaceId?: unknown }).lastWorkspaceId;
	return typeof value === "string" ? value : "";
}

export function appUrl(path: string, base = "") {
	return `${base}${path}`;
}
