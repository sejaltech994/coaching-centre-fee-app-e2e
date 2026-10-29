@settings
Feature: Profile and account
  As a centre owner
  I want to see and change my details and my centre's
  So that my receipts and reminders carry the right names

  "Profile and account" (W11 on the design canvas), for Google-only sign-in:
  the email is the Google account's and can't be changed here; there is no
  password; the mobile number is the owner's own, typed as they like and never
  confirmed with a code.

  @journey
  Scenario: Settings shows my Google email, my number and how I sign in
    Given I have logged in as a new owner
    When I open Settings from the menu
    Then the page is headed "Profile and account"
    And my email is shown as confirmed, from my Google account
    And my mobile number reads "98765 43210"
    And I am never asked to confirm my mobile number
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

  @journey
  Scenario: I can change my mobile number without a code
    Given I have logged in as a new owner
    When I open Settings from the menu
    And I change my mobile number to "+44 7700 900123"
    Then I see "Saved."
    And my mobile number reads "+44 7700 900123"
    When I reload the page
    Then my mobile number reads "+44 7700 900123"

  @journey
  Scenario: The mobile number can be removed
    Given I have logged in as a new owner
    When I open Settings from the menu
    And I change my mobile number to ""
    Then my mobile number reads "Not added"

  @journey
  Scenario: Settings shows the device I'm using
    Given I have logged in as a new owner
    When I open Settings from the menu
    Then my devices are "This device" only

  @journey
  Scenario: I can sign out of my other devices
    Given I have logged in as a new owner
    And I am also signed in on another device
    When I open Settings from the menu
    Then I see 2 devices, this one first
    When I press "Sign out of all other devices"
    Then I see "Signed out of your other devices."
    And my devices are "This device" only
    And the other device is signed out

  @journey
  Scenario: I can download everything the centre has
    Given I have logged in as a new owner
    When I open Settings from the menu
    Then downloading my data gives a JSON file with my centre "Sunrise Classes"

  @journey
  Scenario: Deleting the account waits 30 days, and signing in before then keeps it
    Given I have signed up with Google
    When I open Settings from the menu
    And I delete my account, typing "Sunrise Classes"
    Then I am on the login page
    And I am told "Your account will be deleted in 30 days. Sign in before then to keep it."
    When I continue with Google
    Then I am warned the account will be deleted
    When I open Settings from the menu
    And I press "Keep my account"
    Then I see "Your account is kept."
