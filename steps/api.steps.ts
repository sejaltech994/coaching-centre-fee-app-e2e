import { expect } from "@playwright/test";
import { API_URL, WEB_ORIGIN } from "../support/env";
import { googleSignIn, newGoogleAccount } from "../support/google";
import { Given, Then, When, type World } from "./fixtures";

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

const PROFILE = {
  fullName: "Asha Sharma",
  phone: "98765 43210",
  centreName: "Sunrise Classes",
  city: "Pune",
  centreType: "coaching",
  acceptedTerms: true,
};

/** Signs up the Google account waiting in world.pending; keeps the new access token. */
async function register(world: World, profile: Record<string, unknown>) {
  await send(world, "POST", "/auth/register", { body: profile, headers: { cookie: world.pending! } });
  world.accessToken = (world.api?.body as { accessToken?: string })?.accessToken ?? world.accessToken;
  return world.api!;
}

/** Google sign-in through the API; leaves the callback response in world.api. */
async function signInWithGoogle(world: World) {
  const signedIn = await googleSignIn(world.google!);
  world.api = { status: signedIn.response.status, headers: signedIn.response.headers, body: null };
  world.pending = signedIn.pending;
  if (signedIn.refreshToken) world.refreshTokens.push(signedIn.refreshToken);
  return signedIn;
}

async function signInWithNewGoogleAccount(world: World) {
  world.google = newGoogleAccount();
  await signInWithGoogle(world);
}

/** Signs a new owner up through the API; returns their access token. */
async function apiSignUp(world: World): Promise<string> {
  await signInWithNewGoogleAccount(world);
  const registered = await register(world, PROFILE);
  expect(registered.status, JSON.stringify(registered.body)).toBe(201);
  return (registered.body as { accessToken: string }).accessToken;
}

const location = (world: World) => new URL(world.api!.headers.get("location")!, API_URL);

When("I sign in with a new Google account through the API", async ({ world }) => {
  await signInWithNewGoogleAccount(world);
});

Given("I have signed in with a new Google account through the API", async ({ world }) => {
  await signInWithNewGoogleAccount(world);
  expect(world.pending).not.toBe("");
});

When("I sign in with the same Google account through the API", async ({ world }) => {
  // A new session: earlier refresh tokens (e.g. from signing up) belong to another one.
  world.refreshTokens = [];
  await signInWithGoogle(world);
});

Given("I am logged in through the API as a new owner", async ({ world }) => {
  world.accessToken = await apiSignUp(world);
});

Given("I have signed up through the API", async ({ world }) => {
  world.accessToken = await apiSignUp(world);
});

Then("I am sent to the sign-up page", async ({ world }) => {
  expect(world.api?.status).toBe(302);
  expect(location(world).pathname).toMatch(/\/signup\/?$/);
});

Then("I am sent to my dashboard", async ({ world }) => {
  expect(world.api?.status).toBe(302);
  expect(location(world).pathname).toMatch(/\/dashboard\/?$/);
});

Then("no refresh cookie is set", async ({ world }) => {
  expect(world.api?.headers.getSetCookie().filter((c) => c.startsWith("chukta_rt="))).toEqual([]);
});

Then(
  "the pending sign-in cookie is HttpOnly, SameSite=Lax, scoped to {string} and lasts {int} seconds",
  async ({ world }, path: string, seconds: number) => {
    const cookie = world.api?.headers.getSetCookie().find((c) => c.startsWith("chukta_google="));
    expect(cookie).toBeDefined();
    for (const part of ["HttpOnly", "SameSite=Lax", `Path=${path}`, `Max-Age=${seconds}`]) expect(cookie).toContain(part);
  },
);

When(
  "I sign up through the API with the mobile number {string} for {string}, a {string} centre in {string}",
  async ({ world }, phone: string, centreName: string, centreType: string, city: string) => {
    await register(world, { ...PROFILE, phone, centreName, centreType, city });
  },
);

// JSON bodies contain braces, which Cucumber expressions treat as parameters.
When(/^I sign up through the API with (\{.+\})$/, async ({ world }, json: string) => {
  await register(world, JSON.parse(json));
});

When("I sign up again with the same Google sign-in", async ({ world }) => {
  await register(world, PROFILE);
});

Then(
  "the sign-up says this is a new account on the free plan, with the mobile number {string}",
  async ({ world }, phone: string) => {
    expect(world.api?.body).toMatchObject({
      status: "signed_in",
      isNewAccount: true,
      expiresIn: 900,
      user: { phone, email: world.google!.email, role: "owner" },
      centre: { plan: "free" },
    });
  },
);

Then(
  "my profile has my Google email and the centre {string} in {string}",
  async ({ world }, centreName: string, city: string) => {
    expect(world.api?.body).toMatchObject({
      user: { email: world.google!.email, role: "owner" },
      centre: { name: centreName, city, plan: "free" },
    });
  },
);

// --- Settings ---

// JSON bodies contain braces, which Cucumber expressions treat as parameters, so these use regexes.
When(/^I PATCH "([^"]+)" with body (.+)$/, async ({ world }, path: string, body: string) => {
  await send(world, "PATCH", path, { body: JSON.parse(body) });
});

When(/^I PUT "([^"]+)" with my access token and body (.+)$/, async ({ world }, path: string, body: string) => {
  await send(world, "PUT", path, { body: JSON.parse(body), headers: { authorization: `Bearer ${world.accessToken}` } });
});

When(/^I PATCH "([^"]+)" with my access token and body (.+)$/, async ({ world }, path: string, body: string) => {
  await send(world, "PATCH", path, { body: JSON.parse(body), headers: { authorization: `Bearer ${world.accessToken}` } });
});

Then(
  "the centre is {string}, a {string} centre in {string}",
  async ({ world }, name: string, centreType: string, city: string) => {
    expect((world.api?.body as { centre: unknown }).centre).toMatchObject({ name, centreType, city });
  },
);

Then("my only sign-in method is Google, as my own email", async ({ world }) => {
  expect((world.api?.body as { identities: unknown }).identities).toEqual([
    { provider: "google", email: world.google!.email, lastUsedAt: expect.any(String) },
  ]);
});

// --- Owner's details ---

const asTheOwner = (world: World) => ({ authorization: `Bearer ${world.accessToken}` });

When(/^I POST to "([^"]+)" with my access token and body (.+)$/, async ({ world }, path: string, body: string) => {
  await send(world, "POST", path, { body: JSON.parse(body), headers: asTheOwner(world) });
});

Then("my mobile number is {string}", async ({ world }, phone: string) => {
  expect((world.api?.body as { user: unknown }).user).toMatchObject({ phone });
});

Then("the response lists {int} devices, this one first", async ({ world }, count: number) => {
  const { sessions } = world.api?.body as { sessions: { current: boolean }[] };
  expect(sessions.map((s) => s.current)).toEqual([true, ...Array(count - 1).fill(false)]);
});

// --- Batches ---

const asOwner = (token?: string) => ({ authorization: `Bearer ${token}` });

When(/^I create the batch (.+)$/, async ({ world }, json: string) => {
  const res = await send(world, "POST", "/batches", { body: JSON.parse(json), headers: asOwner(world.accessToken) });
  world.batchId = (res.body as { batch?: { id: string } })?.batch?.id ?? world.batchId;
});

Then(
  "the batch is active with days {string} from {string} to {string}",
  async ({ world }, days: string, startTime: string, endTime: string) => {
    expect((world.api?.body as { batch: unknown }).batch).toMatchObject({
      isActive: true,
      days: days.split(","),
      startTime,
      endTime,
    });
  },
);

When("I GET the batch I created", async ({ world }) => {
  await send(world, "GET", `/batches/${world.batchId}`, { headers: asOwner(world.accessToken) });
});

Then("the error names the fields {string}", async ({ world }, fields: string) => {
  const named = Object.keys((world.api?.body as { error: { fields?: object } }).error.fields ?? {}).sort();
  expect(named).toEqual(fields.split(",").map((f) => f.trim()).sort());
});

When("another new owner logs in through the API", async ({ world }) => {
  const own = world.accessToken;
  world.otherAccessToken = await apiSignUp(world);
  world.accessToken = own;
});

When("they GET the first owner's batch", async ({ world }) => {
  await send(world, "GET", `/batches/${world.batchId}`, { headers: asOwner(world.otherAccessToken) });
});

When("they list their batches", async ({ world }) => {
  await send(world, "GET", "/batches", { headers: asOwner(world.otherAccessToken) });
});

Then("the list is empty", async ({ world }) => {
  expect(world.api?.status).toBe(200);
  expect((world.api?.body as { batches: unknown[] }).batches).toEqual([]);
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
  world.accessToken = (world.api?.body as { accessToken: string }).accessToken;
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
