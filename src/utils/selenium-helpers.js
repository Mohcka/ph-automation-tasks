const { until, By } = require("selenium-webdriver")

class SeleniumHelpers {
  constructor(driver, waitTime) {
    this.driver = driver
    this.waitTime = waitTime
  }
  /**
   * Await for element to be visible before actually clicking on it
   * @param {By} locator - Selenium locator to find the element to click
   * @param {Number} waitFor - Number of milliseconds to wait to click element, default is waitTime set in init()
   */
  async awaitAndClick(locator, waitFor = this.waitTime) {
    await this.driver.wait(until.elementLocated(locator), waitFor)
    await this.driver.findElement(locator).click()
  }

  /**
   * Awaits for element field to be located, and sends keystrokes when its available
   *
   * @param {By} locator - Selenium locator to find the element to click
   * @param {String} keys - Keys to enter into the found field
   * @param {Number} waitFor - Number of milliseconds to wait to click element, default is waitTime set in init()
   */
  async awaitAndSendKeys(locator, keys, waitFor = this.waitTime) {
    await this.driver.wait(until.elementLocated(locator), waitFor)
    await this.driver.findElement(locator).sendKeys(...keys)
  }
}

module.exports = SeleniumHelpers
