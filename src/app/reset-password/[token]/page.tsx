import { AuthPanel } from "@/components/auth/auth-panel"

export default async function ResetPasswordTokenPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ next?: string }>
}) {
  const { token } = await params
  const { next } = await searchParams

  return <AuthPanel mode="reset" token={token} nextPath={next} />
}
