const { until } = require("selenium-webdriver")

let driver = null,
  waitTime = null
/**
 * Initializes variables for use on other functions
 * @param {String} thisDriver - The selenimium webdriver for handling automated webtasks
 * @param {Number} thisWaitTime - Amount of time to wait for each action
 */
module.exports.init = (thisDriver, thisWaitTime) => {
  driver = thisDriver
  waitTime = thisWaitTime
}

/**
 * Await for element to be visible before actually clicking on it
 * @param {By} locator - Selenium locator to find the element to click
 */
module.exports.awaitAndClick = async locator => {
  await driver.wait(until.elementLocated(locator), waitTime)
  await driver.findElement(locator).click()
}

/**
 * Awaits for element field to be located, and sends keystrokes when its available
 *
 * @param {By} locator - Selenium locator to find the element to click
 * @param {String} keys - Keys to enter into the found field
 */
module.exports.awaitAndSendKeys = async (locator, keys) => {
  await driver.wait(until.elementLocated(locator), waitTime)
  await driver.findElement(locator).sendKeys(...keys)
}
