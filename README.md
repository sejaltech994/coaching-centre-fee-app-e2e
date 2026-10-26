# Chukta end-to-end tests

Browser and API tests for [coaching-centre-fee-app](https://github.com/sejaltech994/coaching-centre-fee-app), written as Gherkin feature files and run with [Playwright](https://playwright.dev) through [playwright-bdd](https://vitalets.github.io/playwright-bdd/).

## What's covered

| Feature file | Covers | Scenarios |
| --- | --- | --- |
| [`landing.feature`](features/landing.feature) | Headline and calls to action, section navigation, before/after ledger, steps, pricing, sign-up form hand-off to login, footer, mobile menu (opens on top, Escape, tap outside, link), security headers on the live site | 15 |
| [`login.feature`](features/login.feature) | New owner logs in end to end, wrong code with attempts left, invalid numbers, number formats, rate-limit message, 30-second resend timer, digits-only code box, change number, lost connection | 12 |
| [`dashboard.feature`](features/dashboard.feature) | No session → login, session survives reload, log out ends the session | 3 |
| [`batches.feature`](features/batches.feature) | Empty state, add, unique names, change timing, archive and restore, search, form validation, phone bottom navigation (per the Batches design canvas) | 10 |
| [`api-batches.feature`](features/api-batches.feature) | Batches need a login, create and read, field-level validation errors, one owner can never see another's batches | 4 |
| [`api-auth.feature`](features/api-auth.feature) | Health, validation errors, unauthenticated and forged tokens, refresh/logout without a session, JSON 404, CORS, resend cooldown, cookie flags, one-time codes, refresh-token reuse | 16 |

## Tags

| Tag | Meaning |
| --- | --- |
| `@landing` `@login` `@dashboard` `@api` | Feature area |
| `@mobile` | Runs on a phone-sized screen (Pixel 7) in the `mobile` project |
| `@api` | Calls the API directly; runs in the `api` project |
| `@journey` | Uses the real API and a real OTP read from the API's log. Runs only when `OTP_LOG_FILE` is set |
| `@mocked` | Browser talks to a stubbed API with a controllable clock, so limits and timers are tested on demand |
| `@deployed` | Needs a live HTTPS site (e.g. response headers). Runs only when `WEB_URL` is `https://…` |

## Run locally

Needs Node 22.13+ and the app running (see the app's README: `npm run dev -w apps/api` and `npm run dev -w apps/web`).

```sh
npm install
# Write the API's output to a file so @journey scenarios can read the OTPs:
#   (in the app repo) npm run dev -w apps/api 2>&1 | tee /tmp/chukta-api.log
OTP_LOG_FILE=/tmp/chukta-api.log npm test
```

- **macOS 13:** Playwright's own Chromium no longer supports it. Use your installed Chrome: `PW_CHANNEL=chrome npm test`.
- **One area only:** `npm run test:landing`, `npm run test:api`, or `npx playwright test --grep @mobile`.
- **Watch and debug:** `npm run test:ui`, then `npm run report` for the HTML report with traces.
- **Rate limits:** the API allows 20 codes per IP per hour and a full run needs about 20. Start the API for test runs with `OTP_PER_IP_PER_HOUR=1000` (refused in production), as CI does.

| Variable | Default | Purpose |
| --- | --- | --- |
| `WEB_URL` | `http://localhost:3000` | Web app under test |
| `API_URL` | `http://localhost:8787/api/v1` | API under test |
| `OTP_LOG_FILE` | not set | API log to read OTPs from; enables `@journey` |
| `PW_CHANNEL` | not set | `chrome` to use installed Google Chrome |

## CI

[`.github/workflows/e2e.yml`](.github/workflows/e2e.yml):

- **E2E (local stack):** on every PR, push to `main`, nightly and on demand. Checks out the app: the **Run workflow › app_ref** input if given, else a same-named branch in the app repo (so `feature/x` here tests `feature/x` there), else `develop`, starts its API with a fresh in-memory database and console SMS, serves the built web app, and runs every scenario. The HTML report, traces, videos and API log are uploaded as the `e2e-local-stack` artifact.
- **Smoke (dev site):** nightly and on demand, runs the browser scenarios against https://chukta-web-dev.chukta.workers.dev, including its security headers.

## Writing a new scenario

1. Add it to a `.feature` file in plain language, with the right tags.
2. Run `npx bddgen`: it reports any step without a definition and prints a snippet.
3. Implement missing steps in `steps/*.steps.ts`. Prefer user-facing locators (`getByRole`, `getByLabel`) over CSS.
4. `npm test`, then open a PR. CI must pass before merging.
