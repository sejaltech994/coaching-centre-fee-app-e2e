@api @fee-plans
Feature: Fee plans API contract
  /fee-plans lists, adds and changes a centre's fee plans, in paise. A batch's
  feePlanId is one of the centre's active plans; students who join the batch are
  billed on it, less their discount (PATCH /enrolments/:id).

  Scenario: Fee plans need an access token
    When I GET "/fee-plans"
    Then the response status is 401
    And the error code is "unauthenticated"

  @journey
  Scenario: A plan is added in paise
    Given I am logged in through the API as a new owner
    When I POST to "/fee-plans" with my access token and body {"name":"Monthly","amountPaise":250000,"cycle":"monthly","dueDay":5}
    Then the response status is 201
    And the fee plan is "Monthly", 250000 paise, due on day 5, with no late fee

  @journey
  Scenario: A late fee can't be more than the fee
    Given I am logged in through the API as a new owner
    When I POST to "/fee-plans" with my access token and body {"name":"Monthly","amountPaise":1000,"cycle":"monthly","dueDay":5,"lateFeePaise":5000,"lateFeeAfterDays":7}
    Then the response status is 400
    And the error names the fields "lateFeePaise"

  @journey
  Scenario: A student joining a batch is billed on its plan, and a discount can't exceed the fee
    Given I am logged in through the API as a new owner
    And I have created the fee plan "Monthly" of 250000 paise through the API
    And I have created the batch "Class 10 Maths" on that plan through the API
    And I have added the student "Aarav Sharma" in that batch through the API
    Then the student's batch is billed on "Monthly"
    When I give the student a discount of 300000 paise through the API
    Then the response status is 400
    And the error names the fields "discountPaise"
