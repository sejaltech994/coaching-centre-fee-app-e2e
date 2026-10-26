@landing
Feature: Landing page
  As a tuition or coaching centre owner
  I want to see what Chukta does and start in one step
  So that I can stop chasing fees by hand

  Background:
    Given I open the landing page

  Scenario: The promise and both calls to action are visible
    Then I see the main heading "Stop chasing fees. Get them settled."
    And I see a link "Start free — up to 25 students" that goes to "#start"
    And I see a link "See how it works" that goes to "#how"

  Scenario Outline: The main navigation jumps to each section
    When I follow "<link>" in the main navigation
    Then the "<section>" section is on screen

    Examples:
      | link         | section  |
      | How it works | how      |
      | Features     | features |
      | Pricing      | pricing  |

  Scenario: Every notebook habit is struck off against what replaces it
    Then the before-and-after ledger has 4 entries
    And "A few fees quietly never get paid" is struck through

  Scenario: The three steps are in order
    Then the steps read "Add your students", "Reminders go out" and "Marked paid, receipt sent"

  Scenario: Pricing shows the Free and Pro plans
    Then the pricing section shows "₹0" and "₹499"

  Scenario: The sign-up form carries the number to the login page
    When I enter "98765 43210" in the sign-up form's mobile number field
    And I press "Get OTP"
    Then I am on the login page
    And the mobile number field shows "98765 43210"

  Scenario: The sign-up form needs a number
    When I press "Get OTP"
    Then I am still on the landing page

  Scenario: The footer links to the legal and contact pages
    Then the footer links to "/privacy", "/terms" and "/contact"

  @mobile
  Scenario: The mobile menu opens on top of the page content
    When I open the menu
    Then the menu shows "How it works", "Features", "Pricing", "Log in" and "Start free"
    And no page content covers the menu

  @mobile
  Scenario: The mobile menu closes with Escape
    When I open the menu
    And I press Escape
    Then the menu is closed

  @mobile
  Scenario: The mobile menu closes when I tap outside it
    When I open the menu
    And I tap the page outside the menu
    Then the menu is closed

  @mobile
  Scenario: Choosing a menu link closes the menu
    When I open the menu
    And I choose "Pricing" in the menu
    Then the menu is closed
    And the "pricing" section is on screen

  @deployed
  Scenario: The live site sends its security headers
    Then the page response has the header "x-content-type-options" set to "nosniff"
    And the page response has the header "x-frame-options" set to "DENY"
    And the page response has the header "strict-transport-security"
