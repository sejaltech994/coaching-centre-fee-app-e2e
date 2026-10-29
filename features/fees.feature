@fees
Feature: Fees
  As a centre owner
  I want every fee billed for me, on time
  So that I can see who owes what without keeping a register

  TSD (generate-invoices, mark-overdue): a student who joins a batch with a fee
  plan is billed for the current cycle at once, and the next cycle a week before
  it starts. Unpaid bills go overdue the day after they're due and pick up the
  plan's late fee after its grace days. A bill can be waived, with a reason.

  @journey
  Scenario: A student is billed as soon as they join a batch with a fee plan
    Given I have logged in as a new owner
    And I have the monthly fee plan "Class 10 monthly" of "2,500" due on day "5"
    And I have a batch "Class 10 Maths" on the fee plan "Class 10 monthly"
    And I have the student "Aarav Sharma" in "Class 10 Maths"
    When I open Fees from the menu
    Then the unpaid bills are for "Aarav Sharma"
    And the bill for "Aarav Sharma" is "₹2,500" for this month, in "Class 10 Maths", "Pending"

  @journey
  Scenario: A bill can be waived with a reason
    Given I have logged in as a new owner
    And I have the monthly fee plan "Class 10 monthly" of "2,500" due on day "5"
    And I have a batch "Class 10 Maths" on the fee plan "Class 10 monthly"
    And I have the student "Aarav Sharma" in "Class 10 Maths"
    When I open Fees from the menu
    And I waive the bill for "Aarav Sharma" without a reason
    Then the field "Reason" says "Say why the fee is waived."
    When I give the reason "Sibling scholarship"
    Then I see "Bill waived."
    And the bill for "Aarav Sharma" shows "Waived"
    When I show "Waived" bills
    Then the bills listed are for "Aarav Sharma"

  @journey
  Scenario: A student's page lists their bills
    Given I have logged in as a new owner
    And I have the monthly fee plan "Class 10 monthly" of "2,500" due on day "5"
    And I have a batch "Class 10 Maths" on the fee plan "Class 10 monthly"
    And I have the student "Aarav Sharma" in "Class 10 Maths"
    When I open the student "Aarav Sharma"
    Then their fees list this month's bill of "₹2,500"

  @journey
  Scenario: A batch without a fee plan bills nothing
    Given I have logged in as a new owner
    And I have the student "Aarav Sharma" in no batch
    When I open Fees from the menu
    Then I am told there are no unpaid bills
