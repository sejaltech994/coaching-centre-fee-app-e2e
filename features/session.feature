@session
Feature: Staying logged in, and being logged out when the login ends
  As a centre owner
  I want to stay logged in while I work, and be logged out when my login ends
  So that I'm never stuck on a page that can't load, and nobody carries on in my place

  A login lasts 30 days. The app holds a short-lived access token (15 minutes)
  and quietly renews it from the login. When the login itself has ended (it ran
  out, or this device was signed out from another one), the app logs out and
  sends the owner to sign in, saying why.

  @journey
  Scenario: Opening a signed-in page while logged out asks me to log in
    When I open "/students/" without being logged in
    Then I am on the login page
    And I am told "Log in to continue."

  @journey
  Scenario: An access token that runs out is renewed without my noticing
    Given I have signed up with Google
    When my access token runs out
    And I open Students from the menu
    Then I am told I have no students yet

  @journey
  Scenario: When my login ends I am logged out and asked to log in again
    Given I have signed up with Google
    When my login ends
    And I go to "Students" from the menu
    Then I am on the login page
    And I am told "Your login has expired. Log in to continue."
    When I continue with Google
    Then I am on my dashboard
