import { LoginLink, RegisterLink, LogoutLink, getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export const runtime = "edge"

export default async function LoginPage() {
  const { isAuthenticated } = getKindeServerSession()
  const signedIn = await isAuthenticated()

  return (
    <main className="min-h-screen bg-background px-4 py-16 text-foreground">
      <div className="mx-auto mb-4 flex w-full max-w-md">
        <Button asChild variant="ghost" size="sm" className="pl-2">
          <Link href="/" aria-label="Go back to home">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Go Back
          </Link>
        </Button>
      </div>
      <section className="mx-auto flex max-w-md flex-col gap-6 rounded-2xl border border-border bg-card p-6 shadow-lg">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-wide text-primary">OpenLate account</p>
          <h1 className="text-3xl font-bold">Welcome to OpenLate</h1>
          <p className="text-muted-foreground">
            Sign in to save favorite late-night spots, remember filters, and keep a default location ready for your next night out.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {signedIn ? (
            <LogoutLink>
              <Button className="w-full" size="lg">Log out</Button>
            </LogoutLink>
          ) : (
            <>
              <LoginLink>
                <Button className="w-full" size="lg">Sign in</Button>
              </LoginLink>
              <RegisterLink>
                <Button className="w-full" size="lg" variant="outline">Create account</Button>
              </RegisterLink>
            </>
          )}
        </div>
      </section>
    </main>
  )
}
