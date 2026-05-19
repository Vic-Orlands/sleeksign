import { AuthPanel } from "@/components/auth/auth-panel"

export default async function ResetPasswordTokenPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  return <AuthPanel mode="reset" token={token} />
}
