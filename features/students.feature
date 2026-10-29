@students
Feature: Students
  As a centre owner
  I want a list of my students and the parents who pay
  So that each fee reminder reaches the right parent

  TSD (Data model): a student has a name, a parent's name and mobile number, the
  parent's WhatsApp consent, and a status (active or left). Enrolments put a
  student in a batch from a start date until an end date. A student who leaves
  leaves their batches too; their records stay.

  @journey
  Scenario: A new owner has no students yet
    Given I have logged in as a new owner
    When I open Students from the menu
    Then I am told I have no students yet

  @journey
  Scenario: Adding a student to a batch
    Given I have logged in as a new owner
    And I have a batch "Class 10 Maths"
    When I open Students from the menu
    And I add the student "Aarav Sharma", child of "Neha Sharma" on "98765 43210", to "Class 10 Maths"
    Then I see the student "Aarav Sharma" with "Neha Sharma" on "+91 98765 43210" in "Class 10 Maths"

  @journey
  Scenario: A student's details are checked before they're added
    Given I have logged in as a new owner
    When I open Students from the menu
    And I add a student with no details
    Then the field "Student’s name" says "Enter the student’s name."
    And the field "Parent’s mobile number" says "Enter a 10-digit Indian mobile number."

  @journey
  Scenario: Finding students by batch and by name
    Given I have logged in as a new owner
    And I have a batch "Class 10 Maths"
    And I have the student "Aarav Sharma" in "Class 10 Maths"
    And I have the student "Ishita Rao" in no batch
    When I filter students by the batch "Class 10 Maths"
    Then the students listed are "Aarav Sharma"
    When I filter students by the batch "All batches"
    And I search students for "rao"
    Then the students listed are "Ishita Rao"

  @journey
  Scenario: Moving a student to another batch
    Given I have logged in as a new owner
    And I have a batch "Class 10 Maths"
    And I have a batch "Class 10 Science"
    And I have the student "Aarav Sharma" in "Class 10 Maths"
    When I open the student "Aarav Sharma"
    And I add them to the batch "Class 10 Science"
    And I remove them from the batch "Class 10 Maths"
    Then their batches are "Class 10 Science"

  @journey
  Scenario: A student who leaves is kept, under Left
    Given I have logged in as a new owner
    And I have the student "Aarav Sharma" in no batch
    When I open the student "Aarav Sharma"
    And I mark them as left
    Then they are marked "Left the centre"
    When I open Students from the menu
    Then I am told I have no students yet
    When I show students who have left
    Then the students listed are "Aarav Sharma"
