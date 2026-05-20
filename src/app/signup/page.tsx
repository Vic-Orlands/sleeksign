import { AuthPanel } from "@/components/auth/auth-panel"

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams

  return <AuthPanel mode="signup" nextPath={next} />
}
