import type { Page, Route } from "@playwright/test";

type Reply = { status: number; body?: unknown };
type Recorded = { method: string; path: string; body: unknown };

/**
 * Replaces the API inside the browser for @mocked scenarios, so screens like
 * "too many codes" or the resend timer can be tested on demand, without
 * waiting for real limits. Responses mirror the API's real contract.
 */
export class ApiStub {
  readonly requests: Recorded[] = [];
  private readonly overrides = new Map<string, Reply>();
  private offline = false;
  private signedIn = false;

  constructor(
    private readonly apiUrl: string,
    private readonly webOrigin: string,
  ) {}

  private defaults(path: string, method: string): Reply {
    if (path === "/auth/refresh" && this.signedIn) {
      return { status: 200, body: { accessToken: "stub-access-token", expiresIn: 900 } };
    }
    switch (path) {
      case "/batches":
        return method === "POST"
          ? { status: 500, body: { error: { code: "stub", message: "The stub does not save batches." } } }
          : { status: 200, body: { batches: [], nextCursor: null } };
      case "/auth/google/pending":
        return { status: 200, body: { email: "asha@example.com", name: "Asha Sharma" } };
      case "/centre":
        return { status: 200, body: { centre: { id: "c1", name: null, plan: "free", timezone: "Asia/Kolkata" } } };
      case "/auth/logout":
        return { status: 204 };
      default:
        return { status: 401, body: { error: { code: "unauthenticated", message: "Log in to continue." } } };
    }
  }

  /** The next call to `path` gets this error instead of the default. */
  failNext(path: string, status: number, code: string, message: string): void {
    this.overrides.set(path, { status, body: { error: { code, message } } });
  }

  goOffline(): void {
    this.offline = true;
  }

  /** Pages that need a session get one: /auth/refresh succeeds. */
  signIn(): void {
    this.signedIn = true;
  }

  requestsTo(path: string, method?: string): Recorded[] {
    return this.requests.filter(
      (r) => r.path === path && r.method !== "OPTIONS" && (!method || r.method === method),
    );
  }

  async install(page: Page): Promise<void> {
    await page.route(`${this.apiUrl}/**`, (route) => this.handle(route));
  }

  private async handle(route: Route): Promise<void> {
    if (this.offline) return route.abort("internetdisconnected");
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(new URL(this.apiUrl).pathname, "");
    const cors = {
      "access-control-allow-origin": this.webOrigin,
      "access-control-allow-credentials": "true",
      "access-control-allow-headers": "content-type, authorization",
      "access-control-allow-methods": "GET, POST, PATCH, PUT, DELETE",
    };
    this.requests.push({ method: request.method(), path, body: request.postDataJSON() ?? null });
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });

    const reply = this.overrides.get(path) ?? this.defaults(path, request.method());
    this.overrides.delete(path);
    return route.fulfill({
      status: reply.status,
      headers: { ...cors, "content-type": "application/json" },
      body: reply.body === undefined ? "" : JSON.stringify(reply.body),
    });
  }
}
