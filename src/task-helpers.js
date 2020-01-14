const { until, By } = require("selenium-webdriver")
const selHelper = require("./selenium-helpers")
const { awaitAndClick, awaitAndSendKeys } = require("./selenium-helpers")

let driver = null,
  waitTime = null
/**
 * Initializes variables for use on other functions
 * @param {String} thisDriver - The selenimium webdriver for handling automated webtasks
 * @param {Number} thisWaitTime - Amount of time to wait for each action
 */
function init(thisDriver, thisWaitTime) { 
  driver = thisDriver
  waitTime = thisWaitTime

  selHelper.init(driver, waitTime)
}

/**
 * Enter text into the domain search field to pull up its page
 * @param {String} domain - The domain to be searched
 */
async function pullUpDomainPageFor(domain){
  // Enter Domain page
  await awaitAndClick(By.css(".nav-domains"))
  await driver.wait(
    until.elementLocated(By.id("domains-list-search-text-domainName")),
    waitTime
  )
  await driver.findElement(By.id("domains-list-search-text-domainName")).clear()
  await awaitAndSendKeys(By.id("domains-list-search-text-domainName"), domain)
  await driver.findElement(By.css(".search-field em")).click()

  await driver.sleep(2000)
  await awaitAndClick(By.css("#domains-list-container .odd td a"))
}

module.exports = { init, pullUpDomainPageFor }
