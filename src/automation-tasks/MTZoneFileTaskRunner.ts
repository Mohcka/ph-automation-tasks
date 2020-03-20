import ora, { Ora } from "ora"

import TaskHelper from "../utils/TaskHelper"
import { PipelineDataEntry, PipelineDataCollection } from "../DealDataFetcher"
import { WebDriver, By, until } from "selenium-webdriver"

export default class MTZoneFileTaskRunner {
  private waitTime: number

  private spinner: Ora

  private driver: WebDriver
  private dealsData: PipelineDataCollection
  private failedDeals: PipelineDataEntry[]
  private unverifiedDomains: string[]

  private th: TaskHelper

  constructor(driver: WebDriver, dealsData: PipelineDataCollection) {
    this.driver = driver
    this.dealsData = dealsData

    this.waitTime = 20000

    this.failedDeals = []
    this.unverifiedDomains = []

    this.th = new TaskHelper(this.driver, this.waitTime)
  }

  public async runTask(): Promise<void> {
    this.initializeSpinner()

    // Logins
    await this.th.loginNC()
    await this.loginMT()

    // Create Zonefiles
    for (const deal of this.dealsData) {
      this.spinner.text = `Creating zonefile for: ${
        deal.companyName
      } (${this.dealsData.indexOf(deal) + 1} of ${this.dealsData.length})`

      try {
        await this.createZoneFile(deal)
      } catch (err) {
        console.log(err)
        this.failedDeals.push(deal)
        // close all tabs but main
        const windows = await this.driver.getAllWindowHandles()
        if (windows.length > 1) {
          this.driver.close()

          this.driver.switchTo().window(windows[0])
        }
        // Go back to main page
        await this.driver.get("https://ac.mediatemple.net/home.mt")
      }
    }

    this.spinner.text = "ZF creations finished"
    this.spinner.succeed()

    this.th.logCompletedFeedback(
      this.failedDeals,
      "All zonefiles create successfully"
    )
  }
  /**
   * Creates a zonefile for the domain for the plesk server through the mediatemple interface
   * @param {Array} deal The current deal to create a zonefile for it's domain
   */
  private async createZoneFile(currentDeal: PipelineDataEntry): Promise<void> {
    // Click Add A Domain
    await this.th.awaitAndClick(By.css(".island .btn--ac"))

    //  Enter domain and select already own
    await this.th.awaitAndSendKeys(By.id("domain"), [currentDeal.domain])
    await this.th.awaitAndClick(By.id("dontregister"))

    // Submit
    await this.th.awaitAndClick(By.css(".btn-submit"))

    // Choose A Service
    // Select desired server
    await this.driver.wait(
      until.elementLocated(By.css(".fancyList-item input")),
      this.waitTime
    )
    await this.driver.sleep(1000)
    await this.th.awaitAndClick(By.css(".fancyList-item input"))
    await this.th.awaitAndClick(By.css(".grid-row button"))
    // Grab txtValue
    await this.driver.wait(
      until.elementLocated(By.xpath(`//td[contains(text(), "mt-")]`)),
      this.waitTime
    )
    const txtRecord = await this.driver
      .findElement(By.xpath(`//td[contains(text(), "mt-")]`))
      .getText()

    await this.ncDNSPointTo(txtRecord, currentDeal.domain)

    // await this.ncDNSPointTo()
    // * May require loop
    // Verify domain ownership
    let attempts: number = 0 // amount of attempts to try and verify
    const limit: number = 3
    while (attempts < limit) {
      try {
        await this.driver.sleep(10000)
        await this.th.awaitAndClick(By.id("verifyButton"))
        await this.driver.wait(
          until.elementLocated(By.css(".welcomeBar-message")),
          2000
        )
        attempts = 10
      } catch (err) {
        attempts++
        if (attempts === limit) {
          this.unverifiedDomains.push(currentDeal.domain)
        }
      }
    }

    await this.driver.wait(
      until.elementLocated(By.css(".welcomeBar-message")),
      this.waitTime
    )
  }

  /**
   * Grabs the txt record from the mediatemple domain verification page and points domains txt
   * values on namecheap
   * @param txtRecord - txt record pulled when the domain has been posted to media temple
   * @param domain    - domain to point the txt records for
   */
  private async ncDNSPointTo(txtRecord: string, domain: string) {
    // open new tab and enter namcheap domains list
    await this.driver.executeScript(
      `window.open("https://ap.www.namecheap.com/domains/list", "_blank")`
    )
    const currentTabs: string[] = await this.driver.getAllWindowHandles()
    await this.driver.switchTo().window(currentTabs[1])

    // search for domain to manage
    await this.th.awaitAndSendKeys(
      By.css(`input.gb-form-control[placeholder="Search"]`),
      [domain]
    )
    await this.driver.sleep(2000)
    await this.th.awaitAndClick(
      By.xpath(`//table//a[contains(text(), "Manage")]`)
    )
    // enter DNS tab and provide the TXT record
    await this.th.awaitAndClick(By.css(".advanced-dns"))
    // Set catagory as TXT
    await this.driver.wait(
      until.elementLocated(
        By.xpath(`//span[contains(text(), "Host Records")]`)
      ),
      this.waitTime
    )

    await this.driver.sleep(2000)
    await this.th.awaitAndClick(
      By.xpath(`//p[contains(text(), "CNAME Record")]`)
    )

    await this.th.awaitAndClick(
      By.xpath(`//div[contains(text(), "TXT Record")]`)
    )
    await this.driver.sleep(250) // give it a sec
    await this.driver
      .findElement(By.xpath(`//p[contains(text(), "URL Redirect Record")]`))
      .click()

    await this.th.awaitAndClick(
      By.xpath(`//div[contains(text(), "TXT Record")]`)
    )
    // Enter txt field values
    await this.driver.wait(until.elementLocated(By.css(`input[name="txt"]`)))
    const txtFieldsEl = await this.driver.findElements(
      By.css(`input[name="txt"]`)
    )

    await txtFieldsEl[0].clear()
    await txtFieldsEl[0].sendKeys(txtRecord)
    await txtFieldsEl[1].clear()
    await txtFieldsEl[1].sendKeys(txtRecord)

    // save
    const saveEls = await this.driver.findElements(By.css("tbody .save"))
    await saveEls[0].click()
    await saveEls[1].click()
    await this.driver.sleep(2000) // wait a sec

    await this.driver.close()
    await this.driver.switchTo().window(currentTabs[0])
  }

  private async loginMT(): Promise<void> {
    // Open page
    await this.driver.get("https://ac.mediatemple.net/login.mt")
    // Enter credentials
    await this.th.awaitAndSendKeys(By.id("primary_email"), [
      `${process.env.MEDIATEMPLE_EMAIL}`,
    ])
    await this.th.awaitAndSendKeys(By.id("ac_password"), [
      `${process.env.MEDIATEMPLE_PASS}`,
    ])

    // Submit
    await this.driver.findElement(By.css(".btn--ac")).click()
  }

  private async restartProcess(): Promise<void> {
    await this.driver.get("https://ac.mediatemple.net/home.mt")
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
