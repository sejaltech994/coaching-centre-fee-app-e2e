@login
Feature: Sign in with Google
  As a centre owner
  I want to sign up and sign in with my Google account
  So that I don't need a password or a code

  Google is the only way in. A Google account Chukta hasn't seen goes on to
  "Tell us about your centre" (the design canvas's W3, with W2's name and mobile
  number); a returning one goes straight to the dashboard. The mobile number is
  for WhatsApp reminders and is confirmed later. Outside production the API
  offers a fake Google account chooser, so these journeys need no real account.

  Scenario: The sign-in page offers Google as the only way in
    When I open the login page
    Then the page offers "Continue with Google" and no other way to sign in

  @journey
  Scenario: A new owner signs up with Google and sets up their centre
    Given a Google account that has never used Chukta
    When I open the login page
    And I continue with Google
    Then I am asked about my centre, signed in with my Google account
    And my name from Google is filled in
    When I sign up with the mobile number "98765 43210" for "Sunrise Classes", a "Coaching" centre in "Pune"
    Then I am on the Batches page
    And I am told I have no batches yet

  @journey
  Scenario: A returning owner signs straight in
    Given I have signed up with Google
    When I press "Log out"
    And I open the login page
    And I continue with Google
    Then I am on my dashboard
    And the page is headed "Sunrise Classes"

  @journey
  Scenario: Signing up needs the terms accepted
    Given I have continued with a Google account that has never used Chukta
    When I sign up without accepting the terms
    Then I see the error "Accept the terms and privacy notice to continue."
    And I am still asked about my centre

  @journey
  Scenario: Cancelling at Google comes back to sign-in with an explanation
    When I open the login page
    And I continue with Google but cancel
    Then I see the error "Google sign-in was cancelled. Try again when you’re ready."
    And the page offers "Continue with Google" and no other way to sign in

  @mocked
  Scenario: A mobile number that isn't Indian is explained before anything is sent
    When I open the sign-up page
    And I sign up with the mobile number "12345" for "Sunrise Classes", a "Coaching" centre in "Pune"
    Then the mobile number field says "Enter a 10-digit Indian mobile number."
    And nothing was sent to sign up

  @mocked
  Scenario: Sign-up without a Google sign-in goes back to sign in
    Given the API has no Google sign-in waiting
    When I open the sign-up page
    Then I see the error "Your Google sign-in has expired. Continue with Google again."
    And the page offers "Continue with Google" and no other way to sign in

  @mocked
  Scenario: A lost connection is explained in plain words
    Given the API cannot be reached
    When I open the sign-up page
    Then I see the error "Can't reach Chukta. Check your connection and try again."
