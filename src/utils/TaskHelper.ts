import SeleniumHelper from "./SeleniumHelper"
import { WebDriver, By, until } from "selenium-webdriver"
import { PipelineDataEntry } from "../DealDataFetcher"

import AsciiArt from "./AsciiArt"

export default class TaskHelper {
  private driver: WebDriver
  private waitTime: number
  private sh: SeleniumHelper

  constructor(driver: WebDriver, waitTime: number) {
    this.driver = driver
    this.waitTime = waitTime

    this.sh = new SeleniumHelper(this.driver, this.waitTime)
  }

  // * Plesk Helpers

  async pullUpDomainPageFor(domain: string) {
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
      [domain]
    )
    await this.driver.findElement(By.css(".search-field em")).click()

    await this.driver.sleep(2000)
    await this.sh.awaitAndClick(By.css("#domains-list-container .odd td a"))
  }

  public async loginPlesk() {
    // Enter plesk server
    await this.driver.get("https://dh52-ylwp.accessdomain.com:8443/")

    await this.sh.awaitAndSendKeys(By.css("#loginSection-username"), [
      `${process.env.PLESK_USERNAME}`,
    ])

    // Enter passwaored
    await this.driver
      .findElement(By.css("#loginSection-password"))
      .sendKeys(`${process.env.PLESK_PASSWORD}`)

    // Submit
    await this.driver.findElement(By.css("#btn-send")).click()
  }

  /**
   * Schedules webdriver to login into the namecheap service
   */
  public async loginNC() {
    // Enter login page
    await this.driver.get("https://ap.www.namecheap.com/")
    // Enter login and pass
    await this.sh.awaitAndSendKeys(By.css(`.nc_username_required`), [
      `${process.env.NAMECHEAP_USERNAME}`,
    ])
    await this.sh.awaitAndSendKeys(By.css(`.nc_password_required`), [
      `${process.env.NAMECHEAP_PASSWORD}`,
    ])

    // Submit
    await this.sh.awaitAndClick(By.css(".nc_login_submit"))
  }

  /**
   *
   * @param {*} failedDeals
   * @param {*} successMsg
   */
  public logCompletedFeedback(
    failedDeals: PipelineDataEntry[],
    successMsg = "All tasks processed succsefully"
  ) {
    // tslint:disable-next-line: no-console
    console.log(AsciiArt.complete.rainbow)

    if (failedDeals.length > 0) {
      // tslint:disable-next-line: no-console
      console.log("The following deals have failed".yellow)
      // tslint:disable-next-line: no-console
      console.log(
        failedDeals
          .map(failedDeal => `${failedDeal.companyName} - ${failedDeal.domain}`)
          .join(`\n`).red
      )
    } else {
      // tslint:disable-next-line: no-console
      console.log(successMsg.green)
    }
  }
}

