@google
Feature: Sign up and log in with Google
  As a centre owner
  I want to use my Google account
  So that I don't have to wait for a code every time I log in

  TSD (Registration, login and profile): Google and mobile lead to the same
  account. A new Google owner verifies a mobile number before profile setup,
  because reminders, receipts and recovery depend on it. A matching email alone
  never links Google to an existing account: the owner must enter a code sent
  to that account's mobile number first.

  Outside production the API offers a fake Google account chooser in place of
  Google, so these journeys run without a real Google account.

  @journey
  Scenario: A new owner signs up with Google, verifies a mobile number and sets up their centre
    Given a Google account that has never used Chukta
    And a mobile number that has never logged in
    When I open the login page
    And I continue with Google
    Then I am asked to verify my mobile number for my Google account
    When I enter my mobile number and press "Send code"
    And I enter the code from the SMS
    And I press "Verify"
    Then I am asked to set up my centre
    And my name and email from Google are filled in
    When I set up my centre as "Asha Sharma" running "Sunrise Classes", a "Coaching" centre in "Pune"
    Then I am on the Batches page

  @journey
  Scenario: A returning Google owner logs straight in
    Given I have signed up with Google
    When I press "Log out"
    And I open the login page
    And I continue with Google
    Then I am on my dashboard
    And the page is headed "Sunrise Classes"

  @journey
  Scenario: Google is connected to an existing account only after its mobile number is verified
    Given I have signed up as a new owner with an email
    When I press "Log out"
    And I open the login page
    And I continue with Google using the same email
    Then I am told the email already has an account and asked to verify its mobile number
    When I enter my mobile number and press "Send code"
    And I enter the code from the SMS
    And I press "Verify"
    Then I am on my dashboard
    When I press "Log out"
    And I open the login page
    And I continue with Google using the same email
    Then I am on my dashboard

  @journey
  Scenario: Cancelling at Google comes back to the login page with an explanation
    When I open the login page
    And I continue with Google but cancel
    Then I see the error "Google sign-in was cancelled. Try again, or continue with your mobile number."
    And I can continue with my mobile number
