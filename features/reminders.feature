@reminders
Feature: WhatsApp reminders
  As a centre owner
  I want parents reminded on WhatsApp, with a link to pay
  So that fees come in without me chasing anyone

  TSD (Fee reminder and payment flow): reminders go from Chukta's WhatsApp
  number 3 days before the due date, on it, then 3 and 7 days after, between
  9:00 and 20:00, only to parents who agreed to WhatsApp. The owner can also
  remind by hand, after seeing the exact message, and picks a gentle or firm
  tone. Locally and in CI the API keeps messages instead of sending them.

  @journey
  Scenario: The owner previews and sends a reminder about a bill
    Given I have logged in as a new owner
    And I have the monthly fee plan "Class 10 monthly" of "2,500" due on day "5"
    And I have a batch "Class 10 Maths" on the fee plan "Class 10 monthly"
    And I have the student "Aarav Sharma", whose parent agreed to WhatsApp, in "Class 10 Maths"
    When I open Fees from the menu
    And I start a reminder for "Aarav Sharma"
    Then the reminder reads "Hello Neha Sharma" and has the pay link
    When I send it
    Then I see "Reminder sent."
    When I open Reminders from the menu
    Then the reminders list "Aarav Sharma": "Sent by you", "Sent"

  @journey
  Scenario: A parent who hasn't agreed to WhatsApp isn't messaged
    Given I have logged in as a new owner
    And I have the monthly fee plan "Class 10 monthly" of "2,500" due on day "5"
    And I have a batch "Class 10 Maths" on the fee plan "Class 10 monthly"
    And I have the student "Aarav Sharma" in "Class 10 Maths"
    When I open Fees from the menu
    And I start a reminder for "Aarav Sharma"
    Then I am told "The parent hasn’t agreed to WhatsApp messages." in the dialog

  @journey
  Scenario: The owner makes reminders firm
    Given I have logged in as a new owner
    When I open Reminders from the menu
    And I choose the "Firm" tone
    Then I see "Reminders will now be firm."
