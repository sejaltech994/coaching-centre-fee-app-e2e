@payments
Feature: Payments and receipts
  As a centre owner
  I want parents to pay me directly, and every payment recorded with a receipt
  So that fees reach my account and nobody has to chase paper slips

  TSD (Payments): each centre adds its own UPI ID; a bill's pay link opens the
  parent's UPI app with the centre as payee, so Chukta never holds the money.
  The owner records UPI, cash and bank payments; each gets a numbered receipt
  as a PDF, which the parent can also download from the pay link.

  @journey
  Scenario: The centre adds its own UPI ID
    Given I have logged in as a new owner
    When I open Settings from the menu
    And I add the UPI ID "sunrise@okicici" paid to "Sunrise Classes"
    Then Payments shows "sunrise@okicici", "Paid to Sunrise Classes"

  @journey
  Scenario: A parent opens the pay link and pays the centre by UPI
    Given I have logged in as a new owner
    And my centre takes UPI at "sunrise@okicici" as "Sunrise Classes"
    And I have the monthly fee plan "Class 10 monthly" of "2,500" due on day "5"
    And I have a batch "Class 10 Maths" on the fee plan "Class 10 monthly"
    And I have the student "Aarav Sharma" in "Class 10 Maths"
    When I open Fees from the menu
    And I copy the pay link for "Aarav Sharma"
    Then I see "Pay link copied. Send it to the parent on WhatsApp."
    When the parent opens the pay link
    Then the parent sees "₹2,500" for "Aarav Sharma"
    And the parent can pay "₹2,500" by UPI to "sunrise@okicici"

  @journey
  Scenario: A cash payment marks the bill paid and gives a receipt
    Given I have logged in as a new owner
    And I have the monthly fee plan "Class 10 monthly" of "2,500" due on day "5"
    And I have a batch "Class 10 Maths" on the fee plan "Class 10 monthly"
    And I have the student "Aarav Sharma" in "Class 10 Maths"
    When I open Fees from the menu
    And I copy the pay link for "Aarav Sharma"
    And I record a "Cash" payment for "Aarav Sharma"
    Then I see "Payment recorded. Receipt #1."
    When I show "Paid" bills
    Then the bill for "Aarav Sharma" shows "Paid"
    And the bill for "Aarav Sharma" offers "Receipt #1"
    When the parent opens the pay link
    Then the parent sees "Paid. Thank you!"
    And the parent can download the receipt as a PDF

  @journey
  Scenario: With the centre's own Razorpay, a parent pays by card and the bill is marked paid by itself
    Given I have logged in as a new owner
    And my centre has connected its Razorpay account with test keys
    And I have the monthly fee plan "Class 10 monthly" of "2,500" due on day "5"
    And I have a batch "Class 10 Maths" on the fee plan "Class 10 monthly"
    And I have the student "Aarav Sharma" in "Class 10 Maths"
    When I open Fees from the menu
    And I copy the pay link for "Aarav Sharma"
    And the parent opens the pay link
    And the parent pays "₹2,500" on the centre's Razorpay checkout
    Then the parent sees "Paid. Thank you!"
    When I show "Paid" bills
    Then the bill for "Aarav Sharma" offers "Receipt #1"
