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
