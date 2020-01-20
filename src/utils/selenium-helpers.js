const { until, By } = require("selenium-webdriver")

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

function init(thisDriver, thisWaitTime) {
  driver = thisDriver
  waitTime = thisWaitTime
}

/**
 * Await for element to be visible before actually clicking on it
 * @param {By} locator - Selenium locator to find the element to click
 * @param {Number} waitFor - Number of milliseconds to wait to click element, default is waitTime set in init()
 */
async function awaitAndClick(locator, waitFor = waitTime) {
  await driver.wait(until.elementLocated(locator), waitFor)
  await driver.findElement(locator).click()
}

/**
 * Awaits for element field to be located, and sends keystrokes when its available
 *
 * @param {By} locator - Selenium locator to find the element to click
 * @param {String} keys - Keys to enter into the found field
 * @param {Number} waitFor - Number of milliseconds to wait to click element, default is waitTime set in init()
 */
async function awaitAndSendKeys(locator, keys, waitFor = waitTime) {
  await driver.wait(until.elementLocated(locator), waitFor)
  await driver.findElement(locator).sendKeys(...keys)
}

// Sign into Plesk interface
async function loginPlesk() {
  // Enter plesk server
  await driver.get("https://dh52-ylwp.accessdomain.com:8443/")

  await awaitAndSendKeys(
    By.css("#loginSection-username"),
    process.env.PLESK_USERNAME
  )

  // Enter passwaored
  await driver
    .findElement(By.css("#loginSection-password"))
    .sendKeys(process.env.PLESK_PASSWORD)

  // Submit
  await driver.findElement(By.css("#btn-send")).click()
}

/**
 * Switch to a specifc tab based on the tab's title
 * @param {String} title The key title to search for the specific tab
 */
async function switchToTab(title) {
  
}

module.exports = { init, awaitAndClick, awaitAndSendKeys, loginPlesk }
