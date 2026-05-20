import { AuthPanel } from "@/components/auth/auth-panel"

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams

  return <AuthPanel mode="signin" nextPath={next} />
}
