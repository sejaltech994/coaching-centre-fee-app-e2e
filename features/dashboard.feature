@dashboard
Feature: Signed-in dashboard
  As a centre owner
  I want my session to be kept safely
  So that only I can see my centre

  Scenario: Visitors without a session are sent to log in
    Given the API is replaced by a stub with no session
    When I open the dashboard
    Then I am on the login page

  @journey
  Scenario: The session survives a page reload
    Given I have logged in as a new owner
    When I reload the page
    Then I am on my dashboard

  @journey
  Scenario: Logging out ends the session
    Given I have logged in as a new owner
    When I press "Log out"
    Then I am on the login page
    When I open the dashboard
    Then I am on the login page

  @journey
  Scenario: A new owner is asked to confirm their mobile number
    Given I have logged in as a new owner
    Then I am asked to confirm my mobile number to send fee reminders on WhatsApp
    When I follow "Confirm number" in the banner
    Then the page is headed "Profile and account"
