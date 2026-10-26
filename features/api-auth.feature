@api
Feature: Auth API contract
  The JSON API under /api/v1 that the web app (and later the mobile app) relies on.
  Errors always look like { "error": { "code", "message" } }.

  Scenario: The health check needs no login
    When I GET "/health"
    Then the response status is 200
    And the response body is {"status":"ok"}

  Scenario Outline: Numbers that aren't Indian mobiles are rejected
    When I request an OTP for "<number>"
    Then the response status is 400
    And the error code is "invalid_phone"

    Examples:
      | number     |
      | 12345      |
      | 5876543210 |
      | +14155550100 |

  Scenario: A request without a phone number is rejected
    When I POST to "/auth/otp/request" with body {}
    Then the response status is 400
    And the error code is "invalid_request"

  Scenario: A malformed code is rejected before it is checked
    When I POST to "/auth/otp/verify" with body {"phone":"9876543210","code":"12a456"}
    Then the response status is 400
    And the error code is "invalid_request"

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
  Scenario: A second code within 30 seconds is refused with Retry-After
    Given a mobile number that has never logged in
    When I request an OTP for my number
    And I request an OTP for my number
    Then the response status is 429
    And the error code is "otp_resend_too_soon"
    And the response has a Retry-After of at most 30 seconds

  @journey
  Scenario: A login sets a safe refresh cookie and returns an access token
    Given a mobile number that has never logged in
    When I log in through the API
    Then the response status is 200
    And the login says this is a new account on the free plan
    And the refresh cookie is HttpOnly, SameSite=Strict and scoped to "/api/v1/auth"
    When I GET "/centre" with my access token
    Then the response status is 200

  @journey
  Scenario: A code works only once
    Given a mobile number that has never logged in
    When I log in through the API
    And I verify the same code again
    Then the response status is 400
    And the error code is "otp_expired"

  @journey
  Scenario: Reusing an old refresh token signs that session out
    Given a mobile number that has never logged in
    When I log in through the API
    And I refresh the session
    And I refresh again with the first refresh token
    Then the response status is 401
    And the error code is "refresh_token_reused"
    When I refresh again with the newest refresh token
    Then the response status is 401
