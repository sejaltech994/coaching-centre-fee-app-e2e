@api @students
Feature: Students API contract
  /students lists, adds, shows and changes a centre's students; /enrolments puts
  them in batches and takes them out. Every call needs an access token and sees
  only the caller's centre.

  Scenario: Students need an access token
    When I GET "/students"
    Then the response status is 401
    And the error code is "unauthenticated"

  @journey
  Scenario: A student is added in a batch, from today
    Given I am logged in through the API as a new owner
    And I have created the batch "Class 10 Maths" through the API
    When I add the student "Aarav Sharma" in that batch through the API
    Then the response status is 201
    And the student is active, in "Class 10 Maths"

  @journey
  Scenario: A student is in a batch only once
    Given I am logged in through the API as a new owner
    And I have created the batch "Class 10 Maths" through the API
    And I have added the student "Aarav Sharma" in that batch through the API
    When I enrol the student in that batch again through the API
    Then the response status is 409
    And the error code is "already_enrolled"

  @journey
  Scenario: Another owner can't see or enrol a centre's students
    Given I am logged in through the API as a new owner
    And I have created the batch "Class 10 Maths" through the API
    And I have added the student "Aarav Sharma" in that batch through the API
    When another new owner logs in through the API
    And they GET the first owner's student
    Then the response status is 404
