import { expect } from "@playwright/test";
import { API_URL } from "../support/env";
import { Then, When } from "./fixtures";

// Google sign-in's OAuth contract, through the API directly.

When("I start Google sign-in through the API", async ({ world }) => {
  const res = await fetch(`${API_URL}/auth/google/start`, { redirect: "manual" });
  expect(res.status).toBe(302);
  const cookie = res.headers.getSetCookie().find((c) => c.startsWith("chukta_oauth="));
  world.googleStart = { location: new URL(res.headers.get("location")!, API_URL), cookie: cookie ?? "" };
});

Then(
  "I am sent to the Google account chooser with a state, a nonce and an S256 code challenge",
  async ({ world }) => {
    const params = world.googleStart!.location.searchParams;
    expect(params.get("state")).toMatch(/^.{32,}$/);
    expect(params.get("nonce")).toMatch(/^.{32,}$/);
    expect(params.get("code_challenge")).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(params.get("code_challenge_method")).toBe("S256");
    expect(params.get("redirect_uri")).toMatch(/\/api\/v1\/auth\/google\/callback$/);
  },
);

Then(
  "the OAuth cookie is HttpOnly, SameSite=Lax, scoped to {string} and lasts {int} seconds",
  async ({ world }, path: string, seconds: number) => {
    const cookie = world.googleStart!.cookie;
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain(`Path=${path}`);
    expect(cookie).toContain(`Max-Age=${seconds}`);
  },
);

When("Google sends me back with a different state", async ({ world }) => {
  const res = await fetch(`${API_URL}/auth/google/callback?state=not-the-state&code=anything`, {
    redirect: "manual",
    headers: { cookie: world.googleStart!.cookie.split(";")[0]! },
  });
  world.api = { status: res.status, headers: res.headers, body: null };
});

Then("I am sent back to the login page with the Google error {string}", async ({ world }, error: string) => {
  expect(world.api?.status).toBe(302);
  const location = new URL(world.api!.headers.get("location")!, API_URL);
  expect(location.pathname).toMatch(/\/login\/?$/);
  expect(location.searchParams.get("google_error")).toBe(error);
});

Then("no session cookie is set", async ({ world }) => {
  expect(world.api?.headers.getSetCookie().some((c) => c.startsWith("chukta_rt="))).toBe(false);
});
