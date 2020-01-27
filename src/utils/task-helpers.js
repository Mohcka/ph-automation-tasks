const { until, By } = require("selenium-webdriver")
const SelHelper = require("./selenium-helpers")

const asciiArt = require("./ascii-art")
const colors = require("colors")

class TaskHelper {
  sh = null
  constructor(driver, waitTime) {
    this.driver = driver
    this.waitTime = waitTime

    this.sh = new SelHelper(driver, waitTime)
  }

  //* Plesk Helpers

  async pullUpDomainPageFor(domain) {
    // Enter Domain page
    await this.sh.awaitAndClick(By.css(".nav-domains"))
    await this.driver.wait(
      until.elementLocated(By.id("domains-list-search-text-domainName")),
      this.waitTime
    )
    await this.driver
      .findElement(By.id("domains-list-search-text-domainName"))
      .clear()
    await this.sh.awaitAndSendKeys(
      By.id("domains-list-search-text-domainName"),
      domain
    )
    await this.driver.findElement(By.css(".search-field em")).click()

    await this.driver.sleep(2000)
    await this.sh.awaitAndClick(By.css("#domains-list-container .odd td a"))
  }

  async loginPlesk() {
    // Enter plesk server
    await this.driver.get("https://dh52-ylwp.accessdomain.com:8443/")

    await this.sh.awaitAndSendKeys(
      By.css("#loginSection-username"),
      process.env.PLESK_USERNAME
    )

    // Enter passwaored
    await this.driver
      .findElement(By.css("#loginSection-password"))
      .sendKeys(process.env.PLESK_PASSWORD)

    // Submit
    await this.driver.findElement(By.css("#btn-send")).click()
  }
  /**
   * 
   * @param {*} failedDeals 
   * @param {*} successMsg 
   */
  logCompletedFeedback(
    failedDeals,
    successMsg = "All tasks processed succsefully"
  ) {
    console.log(asciiArt.complete.rainbow)

    if (failedDeals.length > 0) {
      console.log("The following deals have failed".yellow)
      console.log(
        failedDeals
          .map(failedDeal => `${failedDeal.companyName} - ${failedDeal.domain}`)
          .join(`\n`).red
      )
    } else {
      console.log(successMsg.green)
    }
  }
}

module.exports = TaskHelper
