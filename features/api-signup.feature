@api @signup
Feature: Sign-up and profile API contract
  Google is the only way in. A Google account Chukta hasn't seen creates nothing
  at the callback: it waits 15 minutes in a pending cookie while its owner fills
  in sign-up, and POST /auth/register then creates the owner, centre, consent and
  Google link together and starts a session. The mobile number is for WhatsApp
  reminders and stays unconfirmed until a later code. GET /me returns the
  signed-in owner and their centre.

  Scenario: Signing up needs a Google sign-in
    When I POST to "/auth/register" with body {"fullName":"Asha Sharma","phone":"9876543210","centreName":"Sunrise Classes","city":"Pune","centreType":"coaching","acceptedTerms":true}
    Then the response status is 401
    And the error code is "google_pending_missing"

  Scenario: The profile needs an access token
    When I GET "/me"
    Then the response status is 401
    And the error code is "unauthenticated"

  @journey
  Scenario: A new Google account is sent to sign-up, and nothing is created yet
    When I sign in with a new Google account through the API
    Then I am sent to the sign-up page
    And no refresh cookie is set
    And the pending sign-in cookie is HttpOnly, SameSite=Lax, scoped to "/api/v1/auth" and lasts 900 seconds

  @journey
  Scenario: Signing up creates the owner, the centre and a session
    Given I have signed in with a new Google account through the API
    When I sign up through the API with the mobile number "98765 43210" for "Sunrise Classes", a "coaching" centre in "Pune"
    Then the response status is 201
    And the sign-up says this is a new account on the free plan, with the mobile number unconfirmed
    And the refresh cookie is HttpOnly, SameSite=Strict and scoped to "/api/v1/auth"
    When I GET "/me" with my access token
    Then the response status is 200
    And my profile has my Google email and the centre "Sunrise Classes" in "Pune"

  @journey
  Scenario: The terms must be accepted, and the fields at fault are named
    Given I have signed in with a new Google account through the API
    When I sign up through the API with {"fullName":"","phone":"12345","centreName":"","city":"","centreType":"bakery","acceptedTerms":false}
    Then the response status is 400
    And the error code is "invalid_request"
    And the error names the fields "fullName, phone, centreName, city, centreType, acceptedTerms"

  @journey
  Scenario: A Google account signs up only once
    Given I have signed in with a new Google account through the API
    And I sign up through the API with the mobile number "98765 43210" for "Sunrise Classes", a "coaching" centre in "Pune"
    When I sign up again with the same Google sign-in
    Then the response status is 409
    And the error code is "google_in_use"
