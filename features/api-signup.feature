@api @signup
Feature: Sign-up and profile API contract
  TSD (Registration, login and profile): verifying a code for an unknown number
  does not create anything. It returns a short-lived signup ticket; the account,
  centre and consent are created together by POST /auth/register, and only then
  is a session issued. GET /me returns the signed-in owner and their centre.

  Scenario: Registering needs a signup ticket
    When I POST to "/auth/register" with body {"signupTicket":"not-a-ticket","fullName":"Asha Sharma","centreName":"Sunrise Classes","city":"Pune","centreType":"coaching","acceptedTerms":true}
    Then the response status is 400
    And the error code is "signup_ticket_invalid"

  Scenario: The profile needs an access token
    When I GET "/me"
    Then the response status is 401
    And the error code is "unauthenticated"

  @journey
  Scenario: Verifying an unknown number asks for sign-up instead of logging in
    Given a mobile number that has never logged in
    When I verify a code for my number through the API
    Then the response status is 200
    And the response asks me to sign up with a ticket valid for 900 seconds
    And no refresh cookie is set

  @journey
  Scenario: Registering creates the owner, the centre and a session
    Given a mobile number that has never logged in
    And I have verified a code for my number through the API
    When I register as "Asha Sharma" running "Sunrise Classes", a "coaching" centre in "Pune"
    Then the response status is 201
    And the login says this is a new account on the free plan
    And the refresh cookie is HttpOnly, SameSite=Strict and scoped to "/api/v1/auth"
    When I GET "/me" with my access token
    Then the response status is 200
    And my profile is "Asha Sharma" with the centre "Sunrise Classes" in "Pune"

  @journey
  Scenario: The terms must be accepted, and the fields at fault are named
    Given a mobile number that has never logged in
    And I have verified a code for my number through the API
    When I register with {"fullName":"","centreName":"","city":"","centreType":"bakery","acceptedTerms":false}
    Then the response status is 400
    And the error code is "invalid_request"
    And the error names the fields "fullName, centreName, city, centreType, acceptedTerms"

  @journey
  Scenario: A signup ticket works only once
    Given a mobile number that has never logged in
    And I have verified a code for my number through the API
    And I register as "Asha Sharma" running "Sunrise Classes", a "coaching" centre in "Pune"
    When I register again with the same ticket
    Then the response status is 400
    And the error code is "signup_ticket_invalid"

  @journey
  Scenario: An email can belong to only one owner, ignoring case
    Given I have signed up through the API with a new email
    And a mobile number that has never logged in
    And I have verified a code for my number through the API
    When I register with the same email in capitals
    Then the response status is 409
    And the error code is "email_taken"
