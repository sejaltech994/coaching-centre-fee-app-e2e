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
  Scenario: The dashboard never asks to confirm a mobile number
    Given I have logged in as a new owner
    Then I am never asked to confirm my mobile number

  @journey
  Scenario: A new centre's dashboard points to its first steps
    Given I have logged in as a new owner
    When I open the dashboard
    Then the dashboard shows "Collected" "₹0"
    And the dashboard offers "Set up batches"

  @journey
  Scenario: The dashboard shows the month's money once fees are paid
    Given I have logged in as a new owner
    And I have the monthly fee plan "Class 10 monthly" of "2,500" due on day "5"
    And I have a batch "Class 10 Maths" on the fee plan "Class 10 monthly"
    And I have the student "Aarav Sharma" in "Class 10 Maths"
    When I open Fees from the menu
    And I record a "Cash" payment for "Aarav Sharma"
    And I open the dashboard
    Then the dashboard shows "Collected" "₹2,500"
    And the dashboard says "Nobody owes anything overdue."

  @journey
  Scenario: On Pro, the month's report downloads as a spreadsheet
    Given I have logged in as a new owner
    And my centre is on Pro
    And I have the monthly fee plan "Class 10 monthly" of "2,500" due on day "5"
    And I have a batch "Class 10 Maths" on the fee plan "Class 10 monthly"
    And I have the student "Aarav Sharma" in "Class 10 Maths"
    When I open Fees from the menu
    And I record a "Cash" payment for "Aarav Sharma"
    And I open the dashboard
    Then this month's report lists "Aarav Sharma" as "paid" by "cash"
