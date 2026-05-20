import { AuthPanel } from "@/components/auth/auth-panel"

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams

  return <AuthPanel mode="forgot" nextPath={next} />
}
