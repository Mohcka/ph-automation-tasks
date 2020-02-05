import { By, until, WebDriver } from "selenium-webdriver"

import { PipelineDataEntry, PipelineDataCollection } from "../DealDataFetcher"
import TaskHelper from "../utils/TaskHelper"
import { Ora } from "ora"
import ora = require("ora")

export default class DNSTaskRunner {
  private driver: WebDriver

  private waitTime: number = 20000 // Default delay for an element to be found by the webdriver

  private dealsData: PipelineDataCollection
  private currentDeal: PipelineDataEntry // data of a single deal from the pipelinedeals api
  private failedDeals: PipelineDataCollection
  private th: TaskHelper

  private spinner: Ora

  constructor(driver: WebDriver, plDeals: PipelineDataCollection) {
    this.driver = driver
    this.dealsData = plDeals
    this.waitTime = this.waitTime

    this.failedDeals = []

    this.spinner = ora("Stand By...")
    this.spinner.color = "cyan"

    this.th = new TaskHelper(this.driver, this.waitTime)
  }

  /**
   * Schedule webdriver to run through and point nameservers to the mediatemple
   */
  public async runTask(): Promise<void> {
    try {
      await this.th.loginNC()
    } catch (err) {
      console.log("already logged in")
    }

    this.initializeSpinner()

    await this.applyNameCheapNameServers()

    this.spinner.text = "Finished"
    this.spinner.succeed()
  }

  /**
   * Point domains for each of name servers
   */
  private async applyNameCheapNameServers() {
    await this.driver.get("https://ap.www.namecheap.com/domains/list/")

    for (const deal of this.dealsData) {
      this.spinner.text = `Currently pointing: ${deal.domain}`
      this.currentDeal = deal
      try {
        // search for domain to manage
        await this.th.awaitAndSendKeys(
          By.css(`input.gb-form-control[placeholder="Search"]`),
          [this.currentDeal.domain]
        )
        await this.driver.sleep(2000)
        await this.th.awaitAndClick(
          By.xpath(`//table//a[contains(text(), "Manage")]`)
        )
        // Set name servers
        await this.th.awaitAndClick(
          By.css("div.nameservers-row a.select2-choice")
        )
        await this.th.awaitAndClick(
          By.xpath(`//div[contains(text(), "Custom DNS")]`)
        )
        await this.th.awaitAndSendKeys(By.css("#record0"), [
          "ns1.mediatemple.net",
        ])
        await this.th.awaitAndSendKeys(By.css("#record1"), [
          "ns2.mediatemple.net",
        ])
        await this.th.awaitAndClick(By.css(".save"))
        await this.driver.sleep(3000)
        // Go backto domain list
        await this.th.awaitAndClick(By.css(".domains"))
      } catch (err) {
        this.failedDeals.push(this.currentDeal)
        console.log(err)

        // Go back to domains list
        await this.driver.get("https://ap.www.namecheap.com/domains/list")
      }
    }

    this.spinner.text = "Finished"
    this.spinner.stop()

    this.th.logCompletedFeedback(this.failedDeals)
  }

  /**
   * Rev it up
   */
  private initializeSpinner(): void {
    this.spinner = ora("Stand By...")
    this.spinner.color = "cyan"
    this.spinner.spinner = "dots"
    this.spinner.start()
  }
}
