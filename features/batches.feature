@batches
Feature: Batches
  As a centre owner
  I want to set up my batches with their days and times
  So that students can be enrolled and billed per batch

  TSD (Data model): a batch has a name, a subject and a schedule (days + time),
  and can be archived. Names are unique among a centre's batches.
  Screens follow the "Chukta App — Batches" design canvas.

  @journey
  Scenario: A new owner has no batches yet
    Given I have logged in as a new owner
    When I open Batches from the dashboard
    Then I am told I have no batches yet

  @journey
  Scenario: Adding a batch
    Given I have logged in as a new owner
    When I open Batches from the dashboard
    And I add a batch "Class 10 Maths" for "Mathematics" on "Mon, Wed, Fri" from "16:00" to "17:30"
    Then I see the batch "Class 10 Maths" for "Mathematics" on "Mon · Wed · Fri" at "4:00–5:30 pm"
    And the batch counts read "Active · 1" and "Archived · 0"

  @journey
  Scenario: Batch names are unique within a centre, ignoring case
    Given I have logged in as a new owner
    And I have a batch "Kathak juniors"
    When I add a batch "kathak juniors" for "Dance" on "Sat" from "10:00" to "11:00"
    Then I see the error "You already have a batch called “kathak juniors”."

  @journey
  Scenario: Changing a batch's timing
    Given I have logged in as a new owner
    And I have a batch "Class 8 Science"
    When I change the batch "Class 8 Science" to run from "17:00" to "18:00"
    Then I see the batch "Class 8 Science" on "Tue · Thu" at "5:00–6:00 pm"

  @journey
  Scenario: Archiving a batch moves it to Archived, and it can be restored
    Given I have logged in as a new owner
    And I have a batch "Summer camp"
    When I archive the batch "Summer camp"
    Then I don't see the batch "Summer camp"
    When I switch to archived batches
    Then I see the batch "Summer camp" marked "Archived"
    When I restore the batch "Summer camp"
    Then I see the batch "Summer camp" on "Tue · Thu" at "4:00–5:00 pm"

  @journey
  Scenario: Searching batches by name or subject
    Given I have logged in as a new owner
    And I have a batch "Class 10 Maths"
    And I have a batch "Kathak juniors"
    When I search batches for "kathak"
    Then I see the batch "Kathak juniors" on "Tue · Thu" at "4:00–5:00 pm"
    And I don't see the batch "Class 10 Maths"

  @mocked
  Scenario Outline: The batch form explains what is missing before saving
    Given I am signed in
    When I open the Batches page
    And I add a batch "<name>" for "" on "<days>" from "<start>" to "<end>"
    Then I see the error "<error>"
    And no batch was saved

    Examples:
      | name           | days | start | end   | error                               |
      |                | Mon  | 16:00 | 17:00 | Give the batch a name.              |
      | Class 10 Maths |      | 16:00 | 17:00 | Pick at least one day.              |
      | Class 10 Maths | Mon  | 17:00 | 16:00 | The batch must end after it starts. |

  @mobile @mocked
  Scenario: On a phone, Batches is in the bottom navigation
    Given I am signed in
    When I open the dashboard
    And I open Batches from the dashboard
    Then I am on the Batches page

  @journey
  Scenario: A batch's page shows its students and its bills
    Given I have logged in as a new owner
    And I have the monthly fee plan "Class 10 monthly" of "2,500" due on day "5"
    And I have a batch "Class 10 Maths" on the fee plan "Class 10 monthly"
    And I have the student "Aarav Sharma" in "Class 10 Maths"
    When I open the batch "Class 10 Maths" from Batches
    Then the batch's students are "Aarav Sharma"
    And the batch's fees list a bill for "Aarav Sharma"
