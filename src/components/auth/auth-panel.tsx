"use client";

import * as React from "react";
import { ViewTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRightIcon,
  Building2Icon,
  CheckCircle2Icon,
  FileTextIcon,
  LockIcon,
  MailIcon,
  UserIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient, saveLastWorkspaceId } from "@/lib/auth-client";
import { setCurrentWorkspaceId } from "@/lib/workspace-store";
import Link from "next/link";

type AuthPanelProps = {
  mode: AuthMode;
  token?: string;
  nextPath?: string;
};

type AuthMode = "signin" | "signup" | "forgot" | "reset";

const authContent: Record<
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

function AuthPanel({ mode, token, nextPath }: AuthPanelProps) {
  const router = useRouter();
  const [authBusy, setAuthBusy] = React.useState(false);
  const [googleBusy, setGoogleBusy] = React.useState(false);
  const isSignUp = mode === "signup";
  const isSignIn = mode === "signin";
  const isForgot = mode === "forgot";
  const isReset = mode === "reset";
  const isInvitationFlow = Boolean(nextPath?.startsWith("/accept-invitation/"));
  const content = authContent[mode];

  function navigate(href: string) {
    const nextHref = appendNextPath(href, nextPath);
    router.push(nextHref, { scroll: false });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "");
    const password = String(formData.get("password") || "");
    const newPassword = String(formData.get("newPassword") || "");
    const name = String(
      formData.get("name") || email.split("@")[0] || "SleekSign User",
    );
    const workspaceName = String(formData.get("workspace") || "").trim();

    setAuthBusy(true);
    try {
      if (isForgot) {
        await authClient.requestPasswordReset({
          email,
          redirectTo: "/reset-password",
        });
        toast.success("If this email exists, a reset link has been sent");
        navigate("/signin");
        return;
      }

      if (isReset) {
        await authClient.resetPassword({
          newPassword,
          token,
        });
        toast.success("Password reset");
        navigate("/signin");
        return;
      }

      if (isSignUp) {
        await authClient.signUp.email({
          name,
          email,
          password,
          callbackURL: getWorkspaceRedirectPath(nextPath),
        });
        if (workspaceName) {
          const organization = await authClient.organization.create({
            name: workspaceName,
            slug: workspaceName
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/(^-|-$)/g, ""),
          });
          if (organization?.data?.id) {
            setCurrentWorkspaceId(organization.data.id);
            await authClient.$fetch("/organization/set-active", {
              method: "POST",
              body: { organizationId: organization.data.id },
            });
            await saveLastWorkspaceId(organization.data.id);
          }
        }
      } else {
        await authClient.signIn.email({
          email,
          password,
          callbackURL: getWorkspaceRedirectPath(nextPath),
        });
      }

      router.push(
        isSignUp && workspaceName
          ? nextPath || "/hr/documents"
          : getWorkspaceRedirectPath(nextPath),
      );
    } catch {
      toast.error(isSignUp ? "Sign up failed" : "Sign in failed");
    } finally {
      setAuthBusy(false);
    }
  }

  async function signInWithGoogle() {
    setGoogleBusy(true);
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: getWorkspaceRedirectPath(nextPath),
      });
    } catch {
      toast.error("Google sign in is not configured yet");
    } finally {
      setGoogleBusy(false);
    }
  }

  return (
    <main className="grid min-h-svh bg-[(--paper)] text-foreground lg:grid-cols-[minmax(0,0.95fr)_minmax(480px,1.05fr)]">
      <section className="hidden border-r border-border bg-background p-8 lg:flex lg:flex-col">
        <Link href="/">
          <div className="flex items-center gap-2">
            <span className="text-3xl font-cursive text-foreground">
              SleekSign
            </span>
          </div>
        </Link>

        <div className="mt-auto max-w-xl">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Document Operations
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-normal text-foreground">
            <span className="text-orange-400 font-roboto">Prepare,</span>{" "}
            <span className="text-orange-400 font-roboto">send,</span>{" "}
            <span className="text-orange-400 font-roboto">sign,</span> and{" "}
            <span className="text-orange-400 font-roboto">review</span>{" "}
            documents from one focused workspace.
          </h1>
          <div className="mt-8 flex flex-col -space-y-px">
            <AuthSignal
              icon={FileTextIcon}
              label="Edited documents stay separate from untouched uploads"
            />
            <AuthSignal
              icon={CheckCircle2Icon}
              label="Signed documents are reviewable before download"
            />
            <AuthSignal
              icon={Building2Icon}
              label="Workspace switching keeps teams in context"
            />
          </div>
        </div>
      </section>

      <section className="flex min-h-svh items-center justify-center px-4 py-8 sm:px-6">
        <ViewTransition name="auth-card">
          <div className="w-full max-w-md border border-border bg-background p-5 shadow-sm transition-[border-color,box-shadow] duration-200 ease-out sm:p-6">
            <div className="lg:hidden">
              <div className="flex items-center gap-2">
                <span className="text-xl font-cursive">SleekSign</span>
              </div>
            </div>

            <div className="mt-8 sm:mt-0">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {content.eyebrow}
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-normal">
                {content.title}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {content.copy}
              </p>
            </div>

            <form className="mt-6 flex flex-col gap-3" onSubmit={submit}>
              {isSignUp ? (
                <AuthField
                  icon={UserIcon}
                  label="Full name"
                  type="text"
                  name="name"
                  autoComplete="name"
                  placeholder="Alex Kim"
                />
              ) : null}
              {!isReset ? (
                <AuthField
                  icon={MailIcon}
                  label="Email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="alex@company.com"
                />
              ) : null}
              {isSignIn || isSignUp ? (
                <AuthField
                  icon={LockIcon}
                  label="Password"
                  type="password"
                  name="password"
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  placeholder="Password"
                />
              ) : null}
              {isReset ? (
                <AuthField
                  icon={LockIcon}
                  label="New Password"
                  type="password"
                  name="newPassword"
                  autoComplete="new-password"
                  placeholder="New password"
                />
              ) : null}
              {isSignIn ? (
                <button
                  type="button"
                  className="-mt-1 self-end font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => navigate("/forgot-password")}
                >
                  Forgot Password?
                </button>
              ) : null}
              {isSignUp ? (
                <AuthField
                  icon={Building2Icon}
                  label="Workspace"
                  type="text"
                  name="workspace"
                  autoComplete="organization"
                  placeholder={
                    isInvitationFlow
                      ? "Optional workspace name"
                      : "Any Workspace"
                  }
                  required={!isInvitationFlow}
                />
              ) : null}

              <div className="mt-2">
                <Button
                  className="w-full gap-2"
                  type="submit"
                  loading={authBusy}
                  loadingText={getSubmitLoadingLabel(mode)}
                >
                  {getSubmitLabel(mode)}
                  <ArrowRightIcon data-icon="inline-end" />
                </Button>
              </div>
            </form>

            {isSignIn || isSignUp ? (
              <div>
                <div className="my-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <span className="h-px bg-border" />
                  <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                    or
                  </span>
                  <span className="h-px bg-border" />
                </div>

                <div>
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={signInWithGoogle}
                    loading={googleBusy}
                    loadingText="Connecting..."
                  >
                    <span
                      data-icon="inline-start"
                      className="text-[12px] font-bold normal-case tracking-normal"
                    >
                      G
                    </span>
                    Continue with Google
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4 text-sm text-muted-foreground">
              <span>{getSwitcherText(mode)}</span>
              <button
                className="font-mono text-[10px] font-bold uppercase tracking-widest text-foreground transition-colors hover:text-muted-foreground"
                onClick={() => navigate(getSwitcherHref(mode))}
              >
                {getSwitcherAction(mode)}
              </button>
            </div>
          </div>
        </ViewTransition>
      </section>
    </main>
  );
}

function AuthField({
  icon: Icon,
  label,
  ...props
}: React.ComponentProps<"input"> & {
  icon: React.ElementType;
  label: string;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span className="relative block">
        <Icon className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input className="h-9 pl-9" required {...props} />
      </span>
    </label>
  );
}

function getSubmitLabel(mode: AuthMode) {
  if (mode === "signup") return "Create Account";
  if (mode === "forgot") return "Send Reset Link";
  if (mode === "reset") return "Reset Password";
  return "Sign In";
}

function getSubmitLoadingLabel(mode: AuthMode) {
  if (mode === "signup") return "Creating account...";
  if (mode === "forgot") return "Sending reset link...";
  if (mode === "reset") return "Resetting password...";
  return "Signing in...";
}

function getSwitcherText(mode: AuthMode) {
  if (mode === "signup") return "Already have an account?";
  if (mode === "forgot" || mode === "reset") return "Remembered your password?";
  return "New to SleekSign?";
}

function getSwitcherHref(mode: AuthMode) {
  if (mode === "signin") return "/signup";
  return "/signin";
}

function appendNextPath(href: string, nextPath?: string) {
  if (!nextPath) return href;
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}next=${encodeURIComponent(nextPath)}`;
}

function getWorkspaceRedirectPath(nextPath?: string) {
  return appendNextPath("/auth/workspace", nextPath);
}

function getSwitcherAction(mode: AuthMode) {
  if (mode === "signin") return "Sign Up";
  return "Sign In";
}

function AuthSignal({
  icon: Icon,
  label,
}: {
  icon: React.ElementType;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 border border-border bg-card p-3 text-sm text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground">
      <Icon className="size-4 text-foreground" />
      <span>{label}</span>
    </div>
  );
}

export { AuthPanel };
