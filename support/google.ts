import { API_URL } from "./env";

/**
 * Google sign-in through the API's fake account chooser (GOOGLE_PROVIDER=fake),
 * without a browser: start → choose an account → callback. The callback either
 * signs a known Google account in or keeps a new one in a pending cookie and
 * sends the browser to sign-up.
 */
export type GoogleAccount = { email: string; name: string };

export const newGoogleAccount = (): GoogleAccount => ({
  email: `owner-${crypto.randomUUID()}@example.com`,
  name: "Asha Sharma",
});

const cookieNamed = (res: Response, name: string) => res.headers.getSetCookie().find((c) => c.startsWith(`${name}=`));
/** "name=value", ready to send back; "" when absent. */
const sendable = (setCookie: string | undefined) => setCookie?.split(";")[0] ?? "";

export async function googleSignIn(account: GoogleAccount) {
  const start = await fetch(`${API_URL}/auth/google/start`, { redirect: "manual" });
  const chooser = new URL(start.headers.get("location")!, API_URL);
  const approve = new URL(`${API_URL}/auth/google/fake/approve`);
  for (const key of ["redirect_uri", "state", "nonce"]) approve.searchParams.set(key, chooser.searchParams.get(key)!);
  approve.searchParams.set("email", account.email);
  approve.searchParams.set("name", account.name);
  const approved = await fetch(approve, { redirect: "manual" });

  const callback = await fetch(approved.headers.get("location")!, {
    redirect: "manual",
    headers: { cookie: sendable(cookieNamed(start, "chukta_oauth")) },
  });
  return {
    response: callback,
    location: new URL(callback.headers.get("location")!, API_URL),
    /** The Google account waiting to sign up, as a Cookie header value. */
    pending: sendable(cookieNamed(callback, "chukta_google")),
    pendingSetCookie: cookieNamed(callback, "chukta_google"),
    /** The refresh token, when a known Google account signed straight in. */
    refreshToken: cookieNamed(callback, "chukta_rt")?.match(/^chukta_rt=([^;]*)/)?.[1],
  };
}
