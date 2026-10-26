@login
Feature: Log in with a mobile number
  As a centre owner
  I want to log in with an OTP sent to my phone
  So that I don't need a password

  Rules (TSD, Security): 6-digit OTP, valid 5 minutes, at most 5 attempts,
  30 seconds between codes. The first login creates the owner's centre.

  Background:
    Given I open the login page

  @journey
  Scenario: A new owner logs in and lands on their dashboard
    Given a mobile number that has never logged in
    When I enter my mobile number and press "Get OTP"
    Then I am asked for the 6-digit code sent to my number
    When I enter the code from the SMS
    And I press "Verify and log in"
    Then I am on my dashboard
    And I am welcomed to Chukta and asked to name my centre
    And I see "Free plan"

  @journey
  Scenario: A wrong code says how many attempts are left
    Given a mobile number that has never logged in
    When I enter my mobile number and press "Get OTP"
    And I enter a wrong code
    And I press "Verify and log in"
    Then I see the error "That code is not right. 4 attempts left."
    And the code box is empty

  Scenario Outline: An invalid number is explained before any SMS is sent
    Given the API is replaced by a stub
    When I enter "<number>" as my mobile number and press "Get OTP"
    Then I see the error "Enter a 10-digit Indian mobile number."
    And no OTP was requested

    Examples:
      | number         |
      | 12345          |
      | 5876543210     |
      | +1 415 5550100 |

  @mocked
  Scenario: The number from the landing page is accepted in any common format
    When I enter "+91-98765-43210" as my mobile number and press "Get OTP"
    Then an OTP was requested for "+919876543210"
    And I am asked for the 6-digit code sent to "+91 98765 43210"

  @mocked
  Scenario: The server's limit message is shown when too many codes are requested
    Given the API will refuse OTP requests with "rate_limited" "Too many codes requested. Try again later."
    When I enter "9876543210" as my mobile number and press "Get OTP"
    Then I see the error "Too many codes requested. Try again later."
    And I am still asked for my mobile number

  @mocked
  Scenario: A new code can be requested only after 30 seconds
    When I enter "9876543210" as my mobile number and press "Get OTP"
    Then the "Resend code in 0:30" button is disabled
    When 30 seconds pass
    Then the "Resend code" button is enabled
    When I press "Resend code"
    Then 2 OTPs were requested
    And the "Resend code in 0:30" button is disabled

  @mocked
  Scenario: The code box accepts digits only, up to six
    When I enter "9876543210" as my mobile number and press "Get OTP"
    And I type "12a34567" into the code box
    Then the code box shows "123456"

  @mocked
  Scenario: Verifying needs all six digits
    When I enter "9876543210" as my mobile number and press "Get OTP"
    And I type "123" into the code box
    And I press "Verify and log in"
    Then I see the error "Enter the 6-digit code."

  @mocked
  Scenario: I can go back and change the number
    When I enter "9876543210" as my mobile number and press "Get OTP"
    And I press "Change number"
    Then I am still asked for my mobile number
    And the mobile number field shows "9876543210"

  @mocked
  Scenario: A lost connection is explained in plain words
    Given the API cannot be reached
    When I enter "9876543210" as my mobile number and press "Get OTP"
    Then I see the error "Can't reach Chukta. Check your connection and try again."
