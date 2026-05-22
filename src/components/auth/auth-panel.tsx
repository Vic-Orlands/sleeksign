"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
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
import { authClient } from "@/lib/auth-client";

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
  const [displayMode, setDisplayMode] = React.useState(mode);
  const isSignUp = displayMode === "signup";
  const isSignIn = displayMode === "signin";
  const isForgot = displayMode === "forgot";
  const isReset = displayMode === "reset";
  const isInvitationFlow = Boolean(nextPath?.startsWith("/accept-invitation/"));
  const content = authContent[displayMode];
  const springTransition = {
    type: "spring",
    stiffness: 420,
    damping: 34,
  } as const;

  React.useEffect(() => {
    function handlePopState() {
      setDisplayMode(getModeFromPath(window.location.pathname));
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function navigate(href: string) {
    const nextHref = appendNextPath(href, nextPath);
    setDisplayMode(getModeFromPath(href));
    window.history.pushState(null, "", nextHref);
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
          callbackURL: nextPath || "/hr/documents",
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
            localStorage.setItem(
              "sleeksign:workspace-id",
              organization.data.id,
            );
          }
        }
      } else {
        await authClient.signIn.email({
          email,
          password,
          callbackURL: nextPath || "/hr/documents",
        });
      }

      router.push(nextPath || "/hr/documents");
    } catch {
      toast.error(isSignUp ? "Sign up failed" : "Sign in failed");
    }
  }

  async function signInWithGoogle() {
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: nextPath || "/hr/documents",
      });
    } catch {
      toast.error("Google sign in is not configured yet");
    }
  }

  return (
    <LayoutGroup id="auth-flow">
      <main className="grid min-h-svh bg-[var(--paper)] text-foreground lg:grid-cols-[minmax(0,0.95fr)_minmax(480px,1.05fr)]">
        <section className="hidden border-r border-border bg-background p-8 lg:flex lg:flex-col">
          <div className="flex items-center gap-2">
            <span className="text-xl ruthie-regular">SleekSign</span>
          </div>

          <div className="mt-auto max-w-xl">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Document Operations
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-normal text-foreground">
              Prepare, send, sign, and review HR documents from one focused
              workspace.
            </h1>
            <div className="mt-8 grid gap-3">
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
          <motion.div
            layout
            layoutId="auth-card"
            transition={springTransition}
            className="w-full max-w-md border border-border bg-background p-5 shadow-sm transition-[border-color,box-shadow] duration-200 ease-out sm:p-6"
          >
            <div className="lg:hidden">
              <div className="flex items-center gap-2">
                <span className="text-xl ruthie-regular">SleekSign</span>
              </div>
            </div>

            <motion.div
              layout
              className="mt-8 sm:mt-0"
              transition={springTransition}
            >
              <motion.p
                layoutId="auth-eyebrow"
                className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
                transition={springTransition}
              >
                {content.eyebrow}
              </motion.p>
              <motion.h2
                layoutId="auth-title"
                className="mt-3 text-2xl font-semibold tracking-normal"
                transition={springTransition}
              >
                {content.title}
              </motion.h2>
              <motion.p
                layoutId="auth-copy"
                className="mt-2 text-sm text-muted-foreground"
                transition={springTransition}
              >
                {content.copy}
              </motion.p>
            </motion.div>

            <motion.form
              layout
              className="mt-6 flex flex-col gap-3"
              onSubmit={submit}
              transition={springTransition}
            >
              <AnimatePresence initial={false}>
                {isSignUp ? (
                  <AuthField
                    key="name"
                    layoutId="auth-field-name"
                    icon={UserIcon}
                    label="Full name"
                    type="text"
                    name="name"
                    autoComplete="name"
                    placeholder="Alex Kim"
                  />
                ) : null}
              </AnimatePresence>
              {!isReset ? (
                <AuthField
                  layoutId="auth-field-email"
                  icon={MailIcon}
                  label="Email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="alex@company.com"
                />
              ) : null}
              <AnimatePresence initial={false}>
                {isSignIn || isSignUp ? (
                  <AuthField
                    key="password"
                    layoutId="auth-field-password"
                    icon={LockIcon}
                    label="Password"
                    type="password"
                    name="password"
                    autoComplete={
                      isSignUp ? "new-password" : "current-password"
                    }
                    placeholder="Password"
                  />
                ) : null}
              </AnimatePresence>
              <AnimatePresence initial={false}>
                {isReset ? (
                  <AuthField
                    key="new-password"
                    layoutId="auth-field-password"
                    icon={LockIcon}
                    label="New Password"
                    type="password"
                    name="newPassword"
                    autoComplete="new-password"
                    placeholder="New password"
                  />
                ) : null}
              </AnimatePresence>
              <AnimatePresence initial={false}>
                {isSignIn ? (
                  <motion.button
                    key="forgot"
                    layoutId="auth-forgot"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    type="button"
                    className="-mt-1 self-end font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
                    onClick={() => navigate("/forgot-password")}
                    transition={springTransition}
                  >
                    Forgot Password?
                  </motion.button>
                ) : null}
              </AnimatePresence>
              <AnimatePresence initial={false}>
                {isSignUp ? (
                  <AuthField
                    key="workspace"
                    layoutId="auth-field-workspace"
                    icon={Building2Icon}
                    label="Workspace"
                    type="text"
                    name="workspace"
                    autoComplete="organization"
                    placeholder={
                      isInvitationFlow
                        ? "Optional workspace name"
                        : "HR Workspace"
                    }
                    required={!isInvitationFlow}
                  />
                ) : null}
              </AnimatePresence>

              <motion.div
                layout
                layoutId="auth-submit"
                className="mt-2"
                transition={springTransition}
              >
                <Button className="w-full gap-2" type="submit">
                  {getSubmitLabel(displayMode)}
                  <ArrowRightIcon data-icon="inline-end" />
                </Button>
              </motion.div>
            </motion.form>

            {isSignIn || isSignUp ? (
              <>
                <motion.div
                  layoutId="auth-divider"
                  className="my-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3"
                  transition={springTransition}
                >
                  <span className="h-px bg-border" />
                  <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                    or
                  </span>
                  <span className="h-px bg-border" />
                </motion.div>

                <motion.div
                  layoutId="auth-google"
                  transition={springTransition}
                >
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={signInWithGoogle}
                  >
                    <span
                      data-icon="inline-start"
                      className="text-[12px] font-bold normal-case tracking-normal"
                    >
                      G
                    </span>
                    Continue with Google
                  </Button>
                </motion.div>
              </>
            ) : null}

            <motion.div
              layoutId="auth-switcher"
              className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4 text-sm text-muted-foreground"
              transition={springTransition}
            >
              <span>{getSwitcherText(displayMode)}</span>
              <button
                className="font-mono text-[10px] font-bold uppercase tracking-widest text-foreground transition-colors hover:text-muted-foreground"
                onClick={() => navigate(getSwitcherHref(displayMode))}
              >
                {getSwitcherAction(displayMode)}
              </button>
            </motion.div>
          </motion.div>
        </section>
      </main>
    </LayoutGroup>
  );
}

function AuthField({
  icon: Icon,
  label,
  layoutId,
  ...props
}: React.ComponentProps<"input"> & {
  icon: React.ElementType;
  label: string;
  layoutId: string;
}) {
  return (
    <motion.label
      layout
      layoutId={layoutId}
      initial={{
        opacity: 0,
        height: 0,
        y: -6,
        filter: "blur(2px)",
        overflow: "hidden",
      }}
      animate={{
        opacity: 1,
        height: "auto",
        y: 0,
        filter: "blur(0px)",
        overflow: "visible",
      }}
      exit={{
        opacity: 0,
        height: 0,
        y: -6,
        filter: "blur(2px)",
        overflow: "hidden",
      }}
      transition={{ type: "spring", stiffness: 420, damping: 34 }}
      className="grid gap-1.5"
    >
      <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span className="relative block">
        <Icon className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input className="h-9 pl-9" required {...props} />
      </span>
    </motion.label>
  );
}

function getModeFromPath(path: string): AuthMode {
  if (path.startsWith("/signup")) return "signup";
  if (path.startsWith("/forgot-password")) return "forgot";
  if (path.startsWith("/reset-password")) return "reset";
  return "signin";
}

function getSubmitLabel(mode: AuthMode) {
  if (mode === "signup") return "Create Account";
  if (mode === "forgot") return "Send Reset Link";
  if (mode === "reset") return "Reset Password";
  return "Sign In";
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
