import { AuthPanel } from "@/components/auth/auth-panel"

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; next?: string }>
}) {
  const { token, next } = await searchParams

  return <AuthPanel mode="reset" token={token} nextPath={next} />
}
