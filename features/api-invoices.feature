@api @fees
Feature: Invoices API contract
  GET /invoices lists the centre's bills (unpaid by default; filter by status,
  due month, batch and student); POST /invoices/:id/waive waives one with a
  reason. Bills are made by the API itself: at enrolment, and hourly by the
  scheduled jobs.

  Scenario: Bills need an access token
    When I GET "/invoices"
    Then the response status is 401
    And the error code is "unauthenticated"

  @journey
  Scenario: Joining a batch on a plan bills this month at once
    Given I am logged in through the API as a new owner
    And I have created the fee plan "Monthly" of 250000 paise through the API
    And I have created the batch "Class 10 Maths" on that plan through the API
    And I have added the student "Aarav Sharma" in that batch through the API
    When I GET "/invoices" with my access token
    Then the response status is 200
    And there is a "pending" bill for this month of 250000 paise for "Aarav Sharma" in "Class 10 Maths"

  @journey
  Scenario: A waiver needs a reason, and can't be repeated
    Given I am logged in through the API as a new owner
    And I have created the fee plan "Monthly" of 250000 paise through the API
    And I have created the batch "Class 10 Maths" on that plan through the API
    And I have added the student "Aarav Sharma" in that batch through the API
    When I waive the student's bill through the API with the reason ""
    Then the response status is 400
    And the error names the fields "reason"
    When I waive the student's bill through the API with the reason "Scholarship"
    Then the response status is 200
    When I waive the student's bill through the API with the reason "Again"
    Then the response status is 409
    And the error code is "invoice_closed"

  @journey
  Scenario: Another centre's bills can't be seen
    Given I am logged in through the API as a new owner
    And I have created the fee plan "Monthly" of 250000 paise through the API
    And I have created the batch "Class 10 Maths" on that plan through the API
    And I have added the student "Aarav Sharma" in that batch through the API
    When another new owner logs in through the API
    And they GET the first owner's bill
    Then the response status is 404
