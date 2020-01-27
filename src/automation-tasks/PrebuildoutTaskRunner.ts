import { WebDriver, WebElement, By, until } from "selenium-webdriver"

import axios from "axios"

import { Ora } from "ora"
import ora = require("ora")

import colors from "colors"

import { PipelineDataCollection, PipelineDataEntry } from "../DealDataFetcher"

import SeleniumHelper from "../utils/SeleniumHelper"
import TaskHelper from "../utils/TaskHelper"
import AsciiArt from "../utils/AsciiArt"

export default class PrebuildoutTaskRunner {
  private waitTime: number = 60000

  private driver: WebDriver
  private dealsData: PipelineDataCollection
  private failedDeals: PipelineDataCollection
  private currentDeal: PipelineDataEntry

  private spinner: Ora

  private sh: SeleniumHelper
  private th: TaskHelper

  constructor(driver: WebDriver, plData: PipelineDataCollection) {
    this.driver = driver
    this.dealsData = plData

    this.spinner = ora("Stand By...")

    this.failedDeals = []

    this.sh = new SeleniumHelper(this.driver, this.waitTime)
    this.th = new TaskHelper(this.driver, this.waitTime)
  }

  public async runTask(): Promise<void> {
    await this.th.loginPlesk()

    for (const deal of this.dealsData) {
      this.currentDeal = deal
      this.spinner.text = `Currently Working on ${this.currentDeal.companyName} (${this.currentDeal.domain})`
      this.spinner.start()

      try {
        await this.createNewDomain()
        await this.installWordpress()
        await this.switchPLStageToBuildout()
      } catch (err) {
        this.failedDeals.push(this.currentDeal)

        // tslint:disable-next-line: no-console
        console.error(`Err on: ${this.currentDeal.companyName}`)
        // tslint:disable-next-line: no-console
        console.error(err)
        // Go back to main page
        await this.driver.get("https://dh52-ylwp.accessdomain.com:8443/")
      }
    }

    this.spinner.text = "Complete".green
    this.spinner.succeed()

    if (this.failedDeals.length > 0) {
      // tslint:disable-next-line: no-console
      console.log(`The following deals have failed:`.yellow)
      // tslint:disable-next-line: no-console
      console.log(
        this.failedDeals
          .map(failedDeal => `${failedDeal.companyName} - ${failedDeal.domain}`)
          .join(`\n`).red
      )
    } else {
      // tslint:disable-next-line: no-console
      console.log(AsciiArt.complete.rainbow)
      // tslint:disable-next-line: no-console
      console.log("All deals prebuilt successfully ✓".green)
    }
  }

  /**
   * Sechdules a new domain to be created in Plesks
   */
  private async createNewDomain(): Promise<void> {
    // Goto domains
    await this.sh.awaitAndClick(By.css(".nav-domains a"))
    // Create new domain
    await this.sh.awaitAndClick(By.css("#buttonAddDomain"))
    // ##Enter Info
    // Domain name
    await this.sh.awaitAndSendKeys(By.id(`domainName-name`), [
      this.currentDeal.domain,
    ])
    // Username
    await this.sh.awaitAndSendKeys(By.id(`domainInfo-userName`), [
      this.currentDeal.domain.match(/([a-z]*)\./)![1],
    ])
    // Password
    await this.sh.awaitAndSendKeys(By.id(`domainInfo-password`), [
      `${process.env.DOMAIN_ADMIN_PASSWORD}`,
    ])
    // Password Again
    await this.sh.awaitAndSendKeys(By.id(`domainInfo-passwordConfirmation`), [
      `${process.env.DOMAIN_ADMIN_PASSWORD}`,
    ])
    // Let's encrypt it
    await this.sh.awaitAndClick(By.id("sslit-enabled"))

    // Submit domain
    await this.sh.awaitAndClick(By.id("btn-send"))
  }

  private async installWordpress(): Promise<void> {
    // Implying we're at the domains page
    // Enter domain of interest in search
    await this.driver.wait(
      until.elementLocated(By.id("domains-list-search-text-domainName")),
      this.waitTime
    )
    await this.driver
      .findElement(By.id("domains-list-search-text-domainName"))
      .clear()
    await this.sh.awaitAndSendKeys(
      By.id("domains-list-search-text-domainName"),
      [this.currentDeal.domain]
    )
    await this.driver.findElement(By.css(".search-field em")).click()

    await this.driver.sleep(2000)
    await this.sh.awaitAndClick(By.css("#domains-list-container .odd td a"))

    // Initiate wordpress install
    await this.sh.awaitAndClick(By.css(".btn.js-wp-install"))
    // Select Elementor Plugin Set
    await this.sh.awaitAndClick(
      By.xpath(`//select/option[contains(text(), "Elementor")]`)
    )

    // Enter Title
    await this.driver.findElement(By.xpath(`//input[@name="title"]`)).clear()
    await this.sh.awaitAndSendKeys(By.xpath(`//input[@name="title"]`), [
      this.currentDeal.companyName,
    ])
    // Enter username
    const usernameElement: WebElement = await this.driver.findElement(
      By.xpath(`//input[@name="adminUserName"]`)
    )
    await this.driver
      .actions()
      .doubleClick(usernameElement)
      .sendKeys("websitesupport")
      .perform()

    // password
    const passwordFieldElement: WebElement = await this.driver.findElement(
      By.xpath(`//input[@name="adminUserPassword"]`)
    )
    await this.driver
      .actions()
      .doubleClick(passwordFieldElement)
      .sendKeys(process.env.DOMAIN_ADMIN_PASSWORD + "")
      .perform()

    // Install
    await this.sh.awaitAndClick(
      By.css(`button[data-test-id="instance-install-form-submit-button"]`)
    )

    // Installation complete, close prompt
    await this.sh.awaitAndClick(
      By.xpath(`//span[contains(text(), "No, thanks")]/../..`)
    )
  }

  private async switchPLStageToBuildout(): Promise<void> {
    await axios({
      method: "put",
      url: `${process.env.PIPELINE_DEALS_API_URL}/deals/${this.currentDeal.id}.json?api_key=${process.env.PIPELINE_DEALS_API_KEY}`,
      transformRequest: [
        (data: any, headers: any) => {
          const transformedData = `deal[custom_fields[custom_label_1585894]]=${data["deal[custom_fields[custom_label_1585894]]"]}`

          return transformedData
        },
      ],
      data: {
        "deal[custom_fields[custom_label_1585894]]": 3410758, // Buildout - 1
      },
    })
  }
}
