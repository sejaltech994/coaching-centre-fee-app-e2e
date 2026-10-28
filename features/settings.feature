@settings
Feature: Profile and account
  As a centre owner
  I want to see and change my details and my centre's
  So that my receipts and reminders carry the right names

  "Profile and account" (W11 on the design canvas), for Google-only sign-in:
  the email is the Google account's and can't be changed here; there is no
  password; the mobile number shows whether it is confirmed.

  @journey
  Scenario: Settings shows my Google email, my unconfirmed number and how I sign in
    Given I have logged in as a new owner
    When I open Settings from the menu
    Then the page is headed "Profile and account"
    And my email is shown as confirmed, from my Google account
    And my mobile number "+91 98765 43210" is shown as not confirmed
    And I sign in with Google as my own email

  @journey
  Scenario: I can rename my centre, and the change stays
    Given I have logged in as a new owner
    When I open Settings from the menu
    And I change my centre to "Sunrise Academy", a "Tuition" centre in "Patna"
    Then the centre reads "Sunrise Academy · Tuition · Patna"
    And the menu shows the centre "Sunrise Academy"
    When I reload the page
    Then the centre reads "Sunrise Academy · Tuition · Patna"

  @journey
  Scenario: I can change my name
    Given I have logged in as a new owner
    When I open Settings from the menu
    And I change my name to "Asha S. Sharma"
    Then I see "Saved."
    And my name reads "Asha S. Sharma"

  @journey
  Scenario: A name can't be blank
    Given I have logged in as a new owner
    When I open Settings from the menu
    And I change my name to ""
    Then the name field says "Enter your name."

  @journey
  Scenario: Signing out from Settings ends the session
    Given I have logged in as a new owner
    When I open Settings from the menu
    And I press "Sign out"
    Then I am on the login page
    When I open the dashboard
    Then I am on the login page
