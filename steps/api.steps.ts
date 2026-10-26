import { expect } from "@playwright/test";
import { API_URL, WEB_ORIGIN } from "../support/env";
import { Then, When, type World } from "./fixtures";

/**
 * API scenarios use plain fetch rather than Playwright's request context so
 * cookies are sent only when a step says so (needed to replay old refresh tokens).
 */
async function send(world: World, method: string, path: string, init: { body?: unknown; headers?: Record<string, string> } = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { ...(init.body !== undefined && { "content-type": "application/json" }), ...init.headers },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const text = await res.text();
  world.api = { status: res.status, headers: res.headers, body: text ? JSON.parse(text) : null };
  const cookie = res.headers.getSetCookie().find((c) => c.startsWith("chukta_rt="));
  const token = cookie?.match(/^chukta_rt=([^;]*)/)?.[1];
  if (token) world.refreshTokens.push(token);
  return world.api;
}

const errorCode = (world: World) => (world.api?.body as { error?: { code?: string } })?.error?.code;
const refreshWith = (world: World, token: string) =>
  send(world, "POST", "/auth/refresh", { headers: { cookie: `chukta_rt=${token}` } });

When("I GET {string}", async ({ world }, path: string) => {
  await send(world, "GET", path);
});

When("I GET {string} with the access token {string}", async ({ world }, path: string, token: string) => {
  await send(world, "GET", path, { headers: { authorization: `Bearer ${token}` } });
});

When("I GET {string} with my access token", async ({ world }, path: string) => {
  await send(world, "GET", path, { headers: { authorization: `Bearer ${world.accessToken}` } });
});

// JSON bodies contain braces, which Cucumber expressions treat as parameters, so these use regexes.
When(/^I POST to "([^"]+)" with body (.+)$/, async ({ world }, path: string, body: string) => {
  await send(world, "POST", path, { body: JSON.parse(body) });
});

Then(/^the response body is (.+)$/, async ({ world }, body: string) => {
  expect(world.api?.body).toEqual(JSON.parse(body));
});

Then("the response status is {int}", async ({ world }, status: number) => {
  expect(world.api?.status, JSON.stringify(world.api?.body)).toBe(status);
});

Then("the error code is {string}", async ({ world }, code: string) => {
  expect(errorCode(world)).toBe(code);
});

When("I request an OTP for {string}", async ({ world }, phone: string) => {
  await send(world, "POST", "/auth/otp/request", { body: { phone } });
});

When("I request an OTP for my number", async ({ world, otp }) => {
  world.otpMark = otp.mark();
  await send(world, "POST", "/auth/otp/request", { body: { phone: world.phone } });
});

Then("the response has a Retry-After of at most {int} seconds", async ({ world }, max: number) => {
  const retryAfter = Number(world.api?.headers.get("retry-after"));
  expect(retryAfter).toBeGreaterThan(0);
  expect(retryAfter).toBeLessThanOrEqual(max);
});

When("I log in through the API", async ({ world, otp }) => {
  world.otpMark = otp.mark();
  const requested = await send(world, "POST", "/auth/otp/request", { body: { phone: world.phone } });
  expect(requested.status).toBe(202);
  world.lastCode = await otp.codeFor(world.phone!, world.otpMark);
  const login = await send(world, "POST", "/auth/otp/verify", { body: { phone: world.phone, code: world.lastCode } });
  world.accessToken = (login.body as { accessToken?: string }).accessToken;
});

When("I verify the same code again", async ({ world }) => {
  await send(world, "POST", "/auth/otp/verify", { body: { phone: world.phone, code: world.lastCode } });
});

Then("the login says this is a new account on the free plan", async ({ world }) => {
  expect(world.api?.body).toMatchObject({
    isNewAccount: true,
    expiresIn: 900,
    user: { phone: world.phone, role: "owner" },
    centre: { plan: "free" },
  });
});

Then(
  "the refresh cookie is HttpOnly, SameSite=Strict and scoped to {string}",
  async ({ world }, path: string) => {
    const cookie = world.api?.headers.getSetCookie().find((c) => c.startsWith("chukta_rt="));
    expect(cookie).toBeDefined();
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Strict");
    expect(cookie).toContain(`Path=${path}`);
    expect(cookie).toContain("Max-Age=2592000");
  },
);

When("I refresh the session", async ({ world }) => {
  await refreshWith(world, world.refreshTokens.at(-1)!);
  expect(world.api?.status).toBe(200);
});

When("I refresh again with the first refresh token", async ({ world }) => {
  await refreshWith(world, world.refreshTokens[0]!);
});

When("I refresh again with the newest refresh token", async ({ world }) => {
  await refreshWith(world, world.refreshTokens.at(-1)!);
});

When("the web app's origin asks to call {string}", async ({ world }, path: string) => {
  await send(world, "OPTIONS", path, { headers: { origin: WEB_ORIGIN, "access-control-request-method": "POST" } });
});

When("{string} asks to call {string}", async ({ world }, origin: string, path: string) => {
  await send(world, "OPTIONS", path, { headers: { origin, "access-control-request-method": "POST" } });
});

Then("the API allows that origin with credentials", async ({ world }) => {
  expect(world.api?.headers.get("access-control-allow-origin")).toBe(WEB_ORIGIN);
  expect(world.api?.headers.get("access-control-allow-credentials")).toBe("true");
});

Then("the API does not allow that origin", async ({ world }) => {
  expect(world.api?.headers.get("access-control-allow-origin")).toBeNull();
});
