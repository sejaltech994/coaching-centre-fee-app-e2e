@api
Feature: Auth API contract
  The JSON API under /api/v1 that the web app (and later the mobile app) relies on.
  Errors always look like { "error": { "code", "message" } }.

  Scenario: The health check needs no login
    When I GET "/health"
    Then the response status is 200
    And the response body is {"status":"ok"}

  Scenario Outline: Signing in with a mobile number is withdrawn
    When I POST to "<path>" with body {"phone":"9876543210","code":"123456"}
    Then the response status is 404
    And the error code is "not_found"

    Examples:
      | path              |
      | /auth/otp/request |
      | /auth/otp/verify  |

  Scenario: The centre needs an access token
    When I GET "/centre"
    Then the response status is 401
    And the error code is "unauthenticated"

  Scenario: A forged access token is refused
    When I GET "/centre" with the access token "eyJhbGciOiJIUzI1NiJ9.e30.c2lnbmF0dXJl"
    Then the response status is 401

  Scenario: Refreshing without a session is refused
    When I POST to "/auth/refresh" with body {}
    Then the response status is 401
    And the error code is "unauthenticated"

  Scenario: Logging out without a session is harmless
    When I POST to "/auth/logout" with body {}
    Then the response status is 204

  Scenario: Unknown endpoints answer with a JSON 404
    When I GET "/does-not-exist"
    Then the response status is 404
    And the error code is "not_found"

  Scenario: Only the web app may call the API with cookies
    When the web app's origin asks to call "/auth/refresh"
    Then the API allows that origin with credentials
    When "https://evil.example" asks to call "/auth/refresh"
    Then the API does not allow that origin

  @journey
  Scenario: A returning owner's Google sign-in sets a safe refresh cookie
    Given I have signed up through the API
    When I sign in with the same Google account through the API
    Then I am sent to my dashboard
    And the refresh cookie is HttpOnly, SameSite=Strict and scoped to "/api/v1/auth"
    When I refresh the session
    And I GET "/centre" with my access token
    Then the response status is 200

  @journey
  Scenario: Reusing an old refresh token signs that session out
    Given I have signed up through the API
    When I sign in with the same Google account through the API
    And I refresh the session
    And I refresh again with the first refresh token
    Then the response status is 401
    And the error code is "refresh_token_reused"
    When I refresh again with the newest refresh token
    Then the response status is 401

  @google
  Scenario: Google sign-in starts with state, nonce and PKCE, and keeps them in a short-lived cookie
    When I start Google sign-in through the API
    Then I am sent to the Google account chooser with a state, a nonce and an S256 code challenge
    And the OAuth cookie is HttpOnly, SameSite=Lax, scoped to "/api/v1/auth/google" and lasts 600 seconds

  @google
  Scenario: A Google callback whose state doesn't match is refused
    When I start Google sign-in through the API
    And Google sends me back with a different state
    Then I am sent back to the login page with the Google error "failed"
    And no session cookie is set
