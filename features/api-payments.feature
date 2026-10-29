@api @payments
Feature: Payments API contract
  PUT /centre/payment-settings saves the centre's UPI ID; POST
  /invoices/:id/payments records a bill paid in full and issues a receipt
  (GET /receipts/:id/pdf). A bill's payLink token opens GET
  /public/invoices/:token and /public/receipts/:token with no sign-in.

  @journey
  Scenario: A UPI ID must look like one
    Given I am logged in through the API as a new owner
    When I PUT "/centre/payment-settings" with my access token and body {"upiId":"9876543210","payeeName":"Sunrise"}
    Then the response status is 400
    And the error names the fields "upiId"

  @journey
  Scenario: A bill is paid once, with a receipt the parent can open without signing in
    Given I am logged in through the API as a new owner
    And I have created the fee plan "Monthly" of 250000 paise through the API
    And I have created the batch "Class 10 Maths" on that plan through the API
    And I have added the student "Aarav Sharma" in that batch through the API
    When I record a "cash" payment for the student's bill through the API
    Then the response status is 201
    And the bill is paid with receipt 1
    When I record a "cash" payment for the student's bill through the API
    Then the response status is 409
    And the error code is "invoice_closed"
    And the bill's pay link shows it paid, without signing in
    And the bill's receipt is a PDF, for the owner and from the pay link

  @journey
  Scenario: Razorpay webhooks must carry the centre's signature
    Given I am logged in through the API as a new owner
    And I have connected Razorpay through the API with test keys
    When a webhook arrives for my centre signed with the wrong secret
    Then the response status is 401
    And the error code is "bad_signature"
