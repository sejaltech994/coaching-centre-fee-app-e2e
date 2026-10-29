@attendance
Feature: Attendance
  As a centre owner
  I want to mark who came to each class
  So that I know who's missing, and parents can be told

  TSD: daily attendance per batch, with an optional absence alert to parents
  who agreed to WhatsApp (locally the API keeps the message instead of sending).

  @journey
  Scenario: Taking a batch's attendance for today
    Given I have logged in as a new owner
    And I have a batch "Class 10 Maths"
    And I have the student "Aarav Sharma" in "Class 10 Maths"
    When I open Attendance from the menu
    And I mark "Aarav Sharma" "Absent"
    And I save the attendance
    Then I see "Attendance saved."
    When I reload the page
    Then "Aarav Sharma" is marked "Absent"

  @journey
  Scenario: With absence alerts on, the parent is told
    Given I have logged in as a new owner
    And I have a batch "Class 10 Maths"
    And I have the student "Aarav Sharma", whose parent agreed to WhatsApp, in "Class 10 Maths"
    When I open Attendance from the menu
    And I turn absence alerts on
    And I mark "Aarav Sharma" "Absent"
    And I save the attendance
    Then I see "Attendance saved. Absence messages sent: 1."
