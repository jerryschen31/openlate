export const runtime = "edge"

type KindeRouteContext = {
  params: {
    kindeAuth: string
  }
}

export async function GET(request: Request, context: KindeRouteContext) {
  const { handleAuth } = await import("@kinde-oss/kinde-auth-nextjs/server")
  const handler = handleAuth()

  return handler(request, context)
}
