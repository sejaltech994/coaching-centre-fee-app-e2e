@login
Feature: Sign up and log in with a mobile number
  As a centre owner
  I want to sign up or log in with a code sent to my phone
  So that I don't need a password

  TSD (Registration, login and profile): sign-up and login are one flow. An
  unknown number goes to profile setup instead of an error; a returning owner
  goes straight to the dashboard. Codes: 6 digits, valid 5 minutes, 5 tries,
  30 seconds between codes. Screens follow the "Chukta App — Sign up, Login &
  Profile" design canvas (A1 Welcome, A2 Mobile number, A3 Enter the code,
  A4 Wrong code); profile setup (A5) follows its fields from the TSD.

  Background:
    Given I open the login page

  @journey
  Scenario: A new owner signs up with a mobile number and sets up their centre
    Given a mobile number that has never logged in
    When I choose to continue with my mobile number
    And I enter my mobile number and press "Send code"
    Then I am asked for the 6-digit code sent to my number
    When I enter the code from the SMS
    And I press "Verify"
    Then I am asked to set up my centre
    When I set up my centre as "Asha Sharma" running "Sunrise Classes", a "Coaching" centre in "Pune"
    Then I am on the Batches page
    And I am told I have no batches yet

  @journey
  Scenario: A returning owner logs straight in
    Given I have signed up as a new owner
    When I press "Log out"
    And I log in again with the same number
    Then I am on my dashboard
    And the page is headed "Sunrise Classes"

  @journey
  Scenario: A wrong code says how many tries are left
    Given a mobile number that has never logged in
    When I choose to continue with my mobile number
    And I enter my mobile number and press "Send code"
    And I enter a wrong code
    And I press "Verify"
    Then I see the error "That code didn’t match. 4 tries left."

  @journey
  Scenario: Setting up a centre needs the terms accepted
    Given I have verified a mobile number that has never logged in
    When I set up my centre without accepting the terms
    Then I see the error "Accept the terms and privacy notice to continue."
    And I am still asked to set up my centre

  Scenario Outline: An invalid number is explained before any code is sent
    Given the API is replaced by a stub
    When I choose to continue with my mobile number
    And I enter "<number>" as my mobile number and press "Send code"
    Then I see the error "Enter a 10-digit Indian mobile number."
    And no OTP was requested

    Examples:
      | number     |
      | 12345      |
      | 5876543210 |

  @mocked
  Scenario: The number from the landing page is carried over, skipping the welcome screen
    When I open the login page with the number "98765 43210"
    Then the mobile number field shows "98765 43210"

  @mocked
  Scenario: The server's limit message is shown when too many codes are requested
    Given the API will refuse OTP requests with "rate_limited" "Too many codes requested. Try again later."
    When I choose to continue with my mobile number
    And I enter "9876543210" as my mobile number and press "Send code"
    Then I see the error "Too many codes requested. Try again later."
    And I am still asked for my mobile number

  @mocked
  Scenario: A new code can be requested only after 30 seconds
    When I choose to continue with my mobile number
    And I enter "9876543210" as my mobile number and press "Send code"
    Then the "Resend code in 0:30" button is disabled
    When 30 seconds pass
    Then the "Resend code" button is enabled
    When I press "Resend code"
    Then 2 OTPs were requested

  @mocked
  Scenario: A pasted code fills all six boxes
    When I choose to continue with my mobile number
    And I enter "9876543210" as my mobile number and press "Send code"
    And I paste "482913" into the code boxes
    Then the code boxes show "482913"

  @mocked
  Scenario: I can go back and change the number
    When I choose to continue with my mobile number
    And I enter "9876543210" as my mobile number and press "Send code"
    And I follow "Change number"
    Then I am still asked for my mobile number
    And the mobile number field shows "9876543210"

  @mocked
  Scenario: A lost connection is explained in plain words
    Given the API cannot be reached
    When I choose to continue with my mobile number
    And I enter "9876543210" as my mobile number and press "Send code"
    Then I see the error "Can't reach Chukta. Check your connection and try again."
