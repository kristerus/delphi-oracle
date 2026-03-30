import { auth } from "./auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Server-side auth guard. Redirects to /login if no session.
 * Use in server components and server actions.
 */
export async function requireAuth() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  return session;
}

/**
 * Returns the current session without redirecting (returns null if unauthenticated).
 */
export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}
