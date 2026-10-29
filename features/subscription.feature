@subscription
Feature: Free and Pro
  As a centre owner
  I want to start free and pay for Pro when I need it
  So that Chukta costs nothing until it earns its keep

  Free covers up to 25 students with reminders sent by hand; Pro (₹499 a month,
  a Razorpay Subscription on Chukta's own account) adds any number of students,
  automatic reminders and card payments through the centre's own Razorpay.
  Locally and in CI the API's fake checkout stands in for Razorpay.

  @journey
  Scenario: A new centre starts on Free and can go Pro
    Given I have logged in as a new owner
    When I open Settings from the menu
    Then my plan reads "Free" with "0 of 25 students"
    And Payments says "Card payments through your own Razorpay account come with Pro."
    When I go Pro on the checkout
    Then my plan reads "Pro" with "0 students"
    And my plan says it renews

  @journey
  Scenario: Pro can be cancelled, and lasts until the paid month ends
    Given I have logged in as a new owner
    And my centre is on Pro
    When I cancel Pro
    Then my plan says Pro lasts until the month ends
