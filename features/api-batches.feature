@api @batches
Feature: Batches API contract
  GET/POST /batches and GET/PATCH/DELETE /batches/:id (DELETE archives).
  Every batch belongs to the caller's centre; centre_id comes from the token,
  and Postgres row-level security enforces it as a second guard.

  Scenario: Batches need a login
    When I GET "/batches"
    Then the response status is 401
    And the error code is "unauthenticated"

  @journey
  Scenario: Creating and reading a batch
    Given I am logged in through the API as a new owner
    When I create the batch {"name":"Class 10 Maths","subject":"Mathematics","days":["mon","wed","fri"],"startTime":"16:00","endTime":"17:30"}
    Then the response status is 201
    And the batch is active with days "mon,wed,fri" from "16:00" to "17:30"
    When I GET the batch I created
    Then the response status is 200

  @journey
  Scenario: Invalid batches are rejected with the fields at fault
    Given I am logged in through the API as a new owner
    When I create the batch {"name":"","days":[],"startTime":"17:00","endTime":"16:00"}
    Then the response status is 400
    And the error code is "invalid_request"
    And the error names the fields "name, days, endTime"

  @journey
  Scenario: One owner can never see another owner's batches
    Given I am logged in through the API as a new owner
    And I create the batch {"name":"Private batch","days":["mon"],"startTime":"09:00","endTime":"10:00"}
    When another new owner logs in through the API
    And they GET the first owner's batch
    Then the response status is 404
    When they list their batches
    Then the list is empty
