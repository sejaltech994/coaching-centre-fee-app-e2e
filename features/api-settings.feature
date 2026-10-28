@api @settings
Feature: Profile and account API contract
  PATCH /me changes the owner's name; PATCH /centre changes the centre's name,
  city and type, with sign-up's rules and messages. GET /me/identities lists
  how the owner signs in. All need an access token, and act only on the
  owner's own account and centre.

  Scenario Outline: Changing details needs an access token
    When I PATCH "<path>" with body {}
    Then the response status is 401
    And the error code is "unauthenticated"

    Examples:
      | path   |
      | /me    |
      | /centre |

  @journey
  Scenario: Changing the centre's details returns the centre
    Given I am logged in through the API as a new owner
    When I PATCH "/centre" with my access token and body {"centreName":"Sunrise Academy","city":"Patna","centreType":"tuition"}
    Then the response status is 200
    And the centre is "Sunrise Academy", a "tuition" centre in "Patna"

  @journey
  Scenario: The fields at fault are named
    Given I am logged in through the API as a new owner
    When I PATCH "/centre" with my access token and body {"centreName":"","city":"","centreType":"bakery"}
    Then the response status is 400
    And the error names the fields "centreName, city, centreType"

  @journey
  Scenario: My sign-in methods are my Google account
    Given I am logged in through the API as a new owner
    When I GET "/me/identities" with my access token
    Then the response status is 200
    And my only sign-in method is Google, as my own email

  @journey @sms
  Scenario: A mobile number is confirmed with the code sent to it
    Given I am logged in through the API as a new owner
    When I ask the API for a code for a new mobile number
    Then the response status is 202
    When I confirm the number through the API with the code from the SMS
    Then the response status is 200
    And my number is confirmed

  @journey @sms
  Scenario: A number another owner has confirmed can't be confirmed again
    Given I am logged in through the API as a new owner
    And I have confirmed a new mobile number through the API
    When another new owner asks the API for a code for the same number
    Then the response status is 409
    And the error code is "phone_taken"

  @journey
  Scenario: A number that isn't an Indian mobile is named as the field at fault
    Given I am logged in through the API as a new owner
    When I POST to "/me/phone/verify" with my access token and body {"phone":"12345"}
    Then the response status is 400
    And the error names the fields "phone"
