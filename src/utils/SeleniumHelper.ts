import { until, By, WebDriver } from "selenium-webdriver"

/**
 * Preset type to handle keys sent to selenium
 */
export interface WebdriverKeys
  extends Array<string | number | Promise<string | number>> {}

/**
 * Collection of methods to help run webdriver tasks that are frequently used
 */
export default class SeleniumHelper {
  protected driver: WebDriver
  protected waitTime: number

  /**
   *
   * @param driver - webdriver used to automate webtasks
   * @param waitTime - default delay to wait for elements to be found or to sleep
   */
  constructor(driver: WebDriver, waitTime: number) {
    this.driver = driver
    this.waitTime = waitTime
  }

  /**
   * Await for element to be visible before actually clicking on it
   * @param {By} locator - Selenium locator to find the element to click
   * @param {Number} waitFor - Number of milliseconds to wait to click element, default is waitTime set in init()
   */
  async awaitAndClick(locator: By, waitFor = this.waitTime): Promise<void> {
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
  async awaitAndSendKeys(
    locator: By,
    keys: (string | number | Promise<string | number>)[],
    waitFor = this.waitTime
  ): Promise<void> {
    await this.driver.wait(until.elementLocated(locator), waitFor)
    await this.driver.findElement(locator).sendKeys(...keys)
  }
}
