export type ScanNodeKind =
	| "entry"
	| "cron"
	| "agent"
	| "model"
	| "tool"
	| "service"
	| "store"
	| "external";

export type ScanEdgeKind = "calls" | "reads" | "writes" | "triggers";

export type ScanNode = {
	id: string;
	label: string;
	kind: ScanNodeKind;
	sub?: string;
	domain?: string;
	detail?: string;
	group?: string;
	sourceRef?: string;
};

export type ScanEdge = {
	from: string;
	to: string;
	kind?: ScanEdgeKind;
	label?: string;
};

export type RailItem = {
	id: string;
	label: string;
	domain?: string;
};

export type ScanData = {
	version: 1;
	project: {
		name: string;
		slug: string;
		tagline?: string;
		iconDomain?: string;
		date: string;
	};
	stats: {
		agents: number;
		models: number;
		tools: number;
		integrations: number;
	};
	topModels: RailItem[];
	topTools: RailItem[];
	topIntegrations: RailItem[];
	graph: {
		nodes: ScanNode[];
		edges: ScanEdge[];
	};
};

export type EmbeddedNode = {
	id: string;
	label: string;
	kind: "model" | "tool";
	domain?: string;
};

export type FoldedNode = ScanNode & {
	embeds: EmbeddedNode[];
};

export type FoldedGraph = {
	nodes: FoldedNode[];
	edges: ScanEdge[];
};

const topIntegrations: RailItem[] = [
	{ id: "neon", label: "Neon Postgres", domain: "neon.tech" },
	{ id: "cloudflare", label: "Cloudflare R2", domain: "cloudflare.com" },
	{ id: "kms", label: "Google Cloud KMS", domain: "cloud.google.com" },
	{ id: "vercel", label: "Vercel", domain: "vercel.com" },
	{ id: "resend", label: "Resend", domain: "resend.com" },
	{ id: "better-auth", label: "Better Auth", domain: "better-auth.com" },
	{ id: "google-oauth", label: "Google OAuth", domain: "accounts.google.com" },
];

const node = (
	id: string,
	label: string,
	kind: ScanNodeKind,
	options: Omit<ScanNode, "id" | "label" | "kind"> = {},
): ScanNode => ({ id, label, kind, ...options });

const edge = (
	from: string,
	to: string,
	kind: ScanEdgeKind = "calls",
	label?: string,
): ScanEdge => ({ from, to, kind, ...(label ? { label } : {}) });

export const sleeksignScan: ScanData = {
	version: 1,
	project: {
		name: "SleekSign",
		slug: "sleeksign",
		tagline: "Secure document signing with verifiable chain of custody",
		date: "2026-07-18",
	},
	stats: {
		agents: 0,
		models: 0,
		tools: 0,
		integrations: topIntegrations.length,
	},
	topModels: [],
	topTools: [],
	topIntegrations,
	graph: {
		nodes: [
			node("auth-pages", "Auth pages", "entry", {
				sub: "/signin · /signup",
				group: "Identity",
				sourceRef: "src/routes/signin",
			}),
			node("better-auth", "Better Auth", "external", {
				sub: "credentials · sessions",
				group: "Identity",
				domain: "better-auth.com",
			}),
			node("google-oauth", "Google OAuth", "external", {
				sub: "OAuth provider",
				group: "Identity",
				domain: "accounts.google.com",
			}),
			node("workspace-app", "Workspace app", "entry", {
				sub: "/docs · /shared",
				group: "Workspace",
				sourceRef: "src/routes/(app)",
			}),
			node("settings", "Workspace settings", "entry", {
				sub: "/settings",
				group: "Workspace",
				sourceRef: "src/routes/(app)/settings",
			}),
			node("auth-access", "Auth and access", "service", {
				sub: "sessions · workspace",
				group: "Workspace",
				detail: "Resolves authenticated users and their active workspace scope.",
				sourceRef: "src/lib/server/workspace.ts",
			}),
			node("access-control", "Roles and teams", "service", {
				sub: "Owner · Admin · Member",
				group: "Workspace",
				sourceRef: "src/lib/server-access.ts",
			}),
			node("document-setup", "Document setup", "entry", {
				sub: "/docs/[id]/setup",
				group: "Signing",
				sourceRef: "src/routes/(app)/docs/[id]/setup",
			}),
			node("upload-api", "PDF upload API", "entry", {
				sub: "/api/uploads/*",
				group: "Signing",
				sourceRef: "src/routes/api/uploads",
			}),
			node("send-api", "Send document API", "entry", {
				sub: "/api/send-document",
				group: "Signing",
				sourceRef: "src/routes/api/send-document",
			}),
			node("signing-page", "Packet signing", "entry", {
				sub: "/sign/packet/[id]",
				group: "Signing",
				sourceRef: "src/routes/sign/packet/[id]",
			}),
			node("finalize-api", "Packet signing API", "entry", {
				sub: "/api/public-packets/[id]/context",
				group: "Signing",
				sourceRef: "src/routes/api/public-packets/[id]/context",
			}),
			node("signing-workflow", "Signing workflow", "service", {
				sub: "packets · copies · values",
				group: "Signing",
				detail: "Creates signing packets, recipient copies, and participant field values.",
				sourceRef: "src/lib/signing-workflows.ts",
			}),
			node("signed-docs", "Signed documents", "entry", {
				sub: "/signed-docs",
				group: "Trust",
				sourceRef: "src/routes/(app)/signed-docs",
			}),
			node("downloads", "Download service", "service", {
				sub: "single PDF or ZIP",
				group: "Trust",
				sourceRef: "src/routes/api/finalized",
			}),
			node("verify-page", "Public verifier", "entry", {
				sub: "/verify/[id]",
				group: "Trust",
				sourceRef: "src/routes/verify/[id]",
			}),
			node("verification", "Verification service", "service", {
				sub: "manifest + file hashes",
				group: "Trust",
				detail: "Builds canonical manifests and verifies finalized document hashes.",
				sourceRef: "src/lib/document-verification.ts",
			}),
			node("kms-signer", "KMS signer", "service", {
				sub: "ECDSA P-256 manifests",
				group: "Trust",
				sourceRef: "src/lib/google-kms.ts",
			}),
			node("audit-chain", "Audit chain", "service", {
				sub: "tamper-evident custody",
				sourceRef: "src/lib/audit.ts",
			}),
			node("bulk-send-api", "Bulk send API", "entry", {
				sub: "/api/bulk-send/*",
				group: "Delivery",
				sourceRef: "src/routes/api/bulk-send",
			}),
			node("bulk-send", "Bulk delivery", "service", {
				sub: "CSV to signer copies",
				group: "Delivery",
				sourceRef: "src/lib/bulk-send.ts",
			}),
			node("email", "Email service", "service", {
				sub: "OTP + invitations",
				group: "Delivery",
				sourceRef: "src/lib/email",
			}),
			node("documents", "Document service", "service", {
				sub: "metadata + lifecycle",
				sourceRef: "src/lib/documents.ts",
			}),
			node("otp", "Signer OTP", "service", {
				sub: "10-minute challenge",
				sourceRef: "src/lib/signer-otp.ts",
			}),
			node("pdf-finalizer", "PDF finalizer", "service", {
				sub: "render · mark · seal",
				sourceRef: "src/lib/pdf-engine.ts",
			}),
			node("branding", "Branding and domains", "service", {
				sub: "custom domains · sender identity",
				group: "Workspace",
				sourceRef: "src/lib/server/branding.ts",
			}),
			node("r2", "Cloudflare R2", "store", { domain: "cloudflare.com" }),
			node("google-kms", "Google Cloud KMS", "external", {
				domain: "cloud.google.com",
			}),
			node("vercel", "Vercel platform", "external", { domain: "vercel.com" }),
			node("resend", "Resend", "external", { domain: "resend.com" }),
			node("postgres", "Neon Postgres", "store", { domain: "neon.tech" }),
		],
		edges: [
			edge("auth-pages", "better-auth", "triggers", "sign in or sign up"),
			edge("better-auth", "google-oauth", "calls", "OAuth provider"),
			edge("better-auth", "auth-access", "triggers", "session"),
			edge("auth-access", "workspace-app", "triggers", "workspace access"),
			edge("workspace-app", "settings", "triggers", "administration"),
			edge("settings", "access-control"),
			edge("settings", "branding"),
			edge("auth-access", "postgres", "reads", "workspace scope"),
			edge("access-control", "postgres", "writes", "roles and teams"),
			edge("workspace-app", "documents"),
			edge("workspace-app", "document-setup", "triggers", "prepare document"),
			edge("upload-api", "documents", "triggers"),
			edge("upload-api", "r2", "writes", "browser uploads PDF"),
			edge("upload-api", "audit-chain", "writes", "upload custody"),
			edge("documents", "postgres", "writes"),
			edge("document-setup", "signing-workflow"),
			edge("send-api", "signing-workflow", "calls", "recipient copies"),
			edge("send-api", "email", "calls", "signing links"),
			edge("signing-page", "otp", "calls", "when required"),
			edge("signing-page", "signing-workflow", "writes", "field values"),
			edge("signing-page", "finalize-api", "triggers", "required fields done"),
			edge("otp", "email"),
			edge("otp", "postgres", "writes", "hashed challenge"),
			edge("otp", "audit-chain", "writes", "sent and verified"),
			edge("signing-workflow", "postgres", "writes", "packets and values"),
			edge("finalize-api", "signing-workflow", "reads", "checks fields"),
			edge("finalize-api", "pdf-finalizer", "triggers"),
			edge("pdf-finalizer", "r2", "reads", "loads source PDF"),
			edge("pdf-finalizer", "verification", "calls", "seals artifact"),
			edge("verification", "r2", "writes", "final PDF"),
			edge("verification", "audit-chain", "reads", "chain root"),
			edge("verification", "kms-signer", "calls", "canonical manifest"),
			edge("verification", "postgres", "writes", "signed receipt"),
			edge("kms-signer", "vercel", "calls", "OIDC identity"),
			edge("kms-signer", "google-kms", "calls", "P-256 signature"),
			edge("audit-chain", "postgres", "writes", "hash-linked events"),
			edge("signed-docs", "documents", "reads"),
			edge("signed-docs", "downloads", "triggers"),
			edge("downloads", "postgres", "reads", "authorizes files"),
			edge("downloads", "r2", "reads", "PDF or ZIP"),
			edge("verify-page", "verification", "calls", "exact PDF"),
			edge("verification", "google-kms", "calls", "checks signature"),
			edge("bulk-send-api", "bulk-send", "triggers"),
			edge("bulk-send", "signing-workflow", "calls", "copy per CSV row"),
			edge("bulk-send", "email", "calls", "invitations"),
			edge("bulk-send", "postgres", "writes", "job progress"),
			edge("email", "resend"),
			edge("branding", "postgres", "writes", "DNS proof"),
			edge("branding", "email", "calls", "TXT instructions"),
		],
	},
};

export function foldGraph(graph: ScanData["graph"]): FoldedGraph {
	const byId = new Map(graph.nodes.map((item) => [item.id, item]));
	const embeds = new Map<string, EmbeddedNode[]>();

	for (const graphEdge of graph.edges) {
		const target = byId.get(graphEdge.to);
		const source = byId.get(graphEdge.from);
		if (!target || !source || (target.kind !== "model" && target.kind !== "tool")) {
			continue;
		}
		const attached = embeds.get(source.id) || [];
		if (!attached.some((item) => item.id === target.id)) {
			attached.push({
				id: target.id,
				label: target.label,
				kind: target.kind,
				domain: target.domain,
			});
		}
		embeds.set(source.id, attached);
	}

	const nodes = graph.nodes
		.filter((item) => item.kind !== "model" && item.kind !== "tool")
		.map((item) => ({
			...item,
			embeds: (embeds.get(item.id) || []).sort((a, b) =>
				a.kind === b.kind ? 0 : a.kind === "model" ? -1 : 1,
			),
		}));
	const alive = new Set(nodes.map((item) => item.id));

	return {
		nodes,
		edges: graph.edges.filter(
			(graphEdge) => alive.has(graphEdge.from) && alive.has(graphEdge.to),
		),
	};
}
