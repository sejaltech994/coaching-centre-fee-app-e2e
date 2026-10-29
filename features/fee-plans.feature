@fee-plans
Feature: Fee plans
  As a centre owner
  I want to set what each batch's students pay, and when
  So that they can be billed and reminded on time

  TSD (Data model): a fee plan has a name, an amount, a cycle (monthly,
  quarterly or one-time), a due day and an optional late fee. A batch bills its
  students on its plan ("Chukta App — Batches" design canvas); each student can
  have a discount on it.

  @journey
  Scenario: Adding a monthly plan with a late fee
    Given I have logged in as a new owner
    When I open Fee plans from Batches
    And I add the monthly fee plan "Class 10 monthly" of "2,500" due on day "5", with a late fee of "100" after "7" days
    Then I see the fee plan "Class 10 monthly": "Monthly · ₹2,500 · due on the 5th", "Late fee ₹100 after 7 days"

  @journey
  Scenario: A fee plan's amount is checked before it's saved
    Given I have logged in as a new owner
    When I open Fee plans from Batches
    And I add the monthly fee plan "Class 10 monthly" of "abc" due on day "5", with no late fee
    Then the field "Amount" says "Enter an amount of at least ₹1."

  @journey
  Scenario: A batch bills its students on its plan, with a discount per student
    Given I have logged in as a new owner
    And I have the monthly fee plan "Class 10 monthly" of "2,500" due on day "5"
    And I have a batch "Class 10 Maths" on the fee plan "Class 10 monthly"
    Then the batch "Class 10 Maths" shows "Monthly · ₹2,500 · due on the 5th"
    Given I have the student "Aarav Sharma" in "Class 10 Maths"
    When I open the student "Aarav Sharma"
    Then their batch "Class 10 Maths" reads "Monthly · ₹2,500 · due on the 5th · No discount"
    When I give them a discount of "250" on "Class 10 Maths"
    Then their batch "Class 10 Maths" reads "Monthly · ₹2,500 · due on the 5th · ₹250 off"

  @journey
  Scenario: An archived plan is kept apart, and can be restored
    Given I have logged in as a new owner
    And I have the monthly fee plan "Class 10 monthly" of "2,500" due on day "5"
    When I archive the fee plan "Class 10 monthly"
    Then the fee plan "Class 10 monthly" is under Archived
    When I restore the fee plan "Class 10 monthly"
    Then the fee plan "Class 10 monthly" is not under Archived
