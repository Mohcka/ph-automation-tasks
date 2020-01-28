import path from "path"
import { WebDriver, By, until } from "selenium-webdriver"
import { Ora } from "ora"
import ora = require("ora")

import TemplateGenerator from "../template-generator"
import { PipelineDataCollection, PipelineDataEntry } from "../DealDataFetcher"
import TaskHelper from "../utils/TaskHelper"

import TextUtils from "../utils/TextUtils"
import AsciiArt from "../utils/AsciiArt"

export default class WPConfigTaskRunner {
  private waitTime: number = 60000

  private driver: WebDriver
  private dealsData: PipelineDataCollection
  private currentDeal: PipelineDataEntry
  private failedDeals: PipelineDataCollection
  private unsecruedDomains: PipelineDataCollection

  private th: TaskHelper

  private spinner: Ora

  private pageName: string

  constructor(driver: WebDriver, plData: PipelineDataCollection) {
    this.driver = driver
    this.dealsData = plData

    this.failedDeals = []
    this.unsecruedDomains = []

    this.th = new TaskHelper(this.driver, this.waitTime)

    this.spinner = ora("Stand By...")
    this.spinner.color = "cyan"
    this.spinner.spinner = "dots6"

    this.pageName = "Home"
  }

  public async runTask(): Promise<void> {
    // Generate Tempaltes
    await new TemplateGenerator(this.dealsData).generateTemplates()

    this.spinner.start()

    try {
      await this.loginElementor()
    } catch (err) {
      // tslint:disable-next-line: no-console
      console.log("Failed to login to Elementor [NE]".red)
    }

    await this.th.loginPlesk()

    for (const deal of this.dealsData) {
      try {
        this.currentDeal = deal
        this.spinner.text = `Now working on ${deal.companyName}`

        // Login deal wordpress
        await this.loginWP()
        await this.catchNonSecuredWebsitePage()

        // Activate Elementor Pro
        try {
          await this.connectAndActivateElementor()
        } catch (err) {
          // tslint:disable-next-line: no-console
          console.log(
            `Elementor seems to be already activated for ${this.currentDeal.domain}`
              .yellow
          )
        }

        // import theme
        await this.importTemplate()

        try {
          await this.activateAstra()
        } catch (err) {
          // tslint:disable-next-line: no-console
          console.log(
            "Astra activation failed.  It may have already be installed".yellow
          )
        }
        // Upload elementor
        // Creating homepage
        await this.createHomePage()

        // Set as homepage
        await this.indexHomePage()
        // Close tab and go back to plesk
        await this.restart()
      } catch (err) {
        this.failedDeals.push(this.currentDeal)
        // tslint:disable-next-line: no-console
        console.log(err)
        // close tab and go back to main tab if wordpres was opened prior
        await this.restart()
      }
    }

    this.logFailures()
  }

  private async loginWP(): Promise<void> {
    // Goto domains
    await this.th.awaitAndClick(By.css(".nav-domains a"))
    // Enter target domain page
    await this.th.pullUpDomainPageFor(this.currentDeal.domain)
    // Login to wordpress
    await this.th.awaitAndClick(
      By.xpath(
        `//div[@class="caption-service-toolbar"]/a[contains(text(), "Log In")]`
      )
    )

    // Switch tab to wordpress
    const tabs = await this.driver.getAllWindowHandles()
    await this.driver.switchTo().window(tabs[1])
  }

  private async createHomePage(): Promise<void> {
    // Enter Pages page
    await this.th.awaitAndClick(By.id(`menu-pages`))
    // Add new page
    await this.th.awaitAndClick(
      By.xpath(`//div[@class="wrap"]//a[contains(text(), "Add New")]`)
    )
    // Enter "Home" in title
    await this.th.awaitAndSendKeys(By.id("post-title-0"), [this.pageName])
    // Configure settings to work with elementor
    // Disable all sections
    const disableInputs = await this.driver.findElements(
      By.css(".disable-section-meta input")
    )
    for (const disableInputEl of disableInputs) {
      await disableInputEl.click()
    }
    // Apply no sidebar
    await this.th.awaitAndClick(By.css(`option[value="no-sidebar"]`))
    // Apply full width content layout
    await this.th.awaitAndClick(By.css(`option[value="page-builder"]`))

    // Open page attributes and select Elementor Canvas template
    await this.th.awaitAndClick(
      By.xpath(`//button[contains(text(), "Page Attributes")]`)
    )
    await this.th.awaitAndClick(By.css(`option[value="elementor_canvas"]`))
    // publithis.th
    await this.th.awaitAndClick(By.css(".editor-post-publish-panel__toggle"))
    // Do it again!
    await this.driver.sleep(1000)
    await this.th.awaitAndClick(By.css(".editor-post-publish-button"))

    // Wait for page to be published
    await this.driver.wait(
      until.elementLocated(By.xpath(`//*[contains(text(), "Published")]`)),
      this.waitTime
    )

    // Apply Elementor Page
    await this.applyElementorPage()
  }

  private async applyElementorPage(): Promise<void> {
    // Immplying we're already on the wp edit page for the current page, start elementor buildout
    // Apply elementor
    await this.th.awaitAndClick(By.id("elementor-switch-mode-button"))
    // insert template
    const elAddTemplate = By.css(".elementor-add-template-button")
    const elementorIframeLocator = By.id("elementor-preview-iframe")
    // await driver.wait(until.elementLocated(elAddTemplate), WAIT_TIME)
    // let passed = false

    // console.log(await driver.getAllWindowHandles())

    await this.driver.wait(
      until.ableToSwitchToFrame(elementorIframeLocator),
      this.waitTime
    )
    await this.driver.switchTo().defaultContent()

    // find element
    const elementorIframeEl = await this.driver.findElement(
      elementorIframeLocator
    )
    await this.driver.switchTo().frame(elementorIframeEl)

    await this.driver.findElement(elAddTemplate).click()

    await this.driver.switchTo().defaultContent()

    await this.th.awaitAndClick(
      By.xpath(`//div[contains(text(), "My Templates")]`)
    )
    await this.th.awaitAndClick(
      By.xpath(
        `//div[contains(text(), "${this.currentDeal.companyName} Template")]/..//button`
      )
    )
    await this.driver.sleep(2000) // give it a sec
    // Update the page
    await this.th.awaitAndClick(By.id("elementor-panel-saver-button-publish"))
    await this.driver.wait(
      until.elementLocated(
        By.css("#elementor-panel-saver-button-publish.elementor-disabled")
      )
    )
    // head back out to wp
    await this.th.awaitAndClick(By.css(".elementor-header-button"))
    await this.th.awaitAndClick(
      By.css(".elementor-panel-menu-item-exit-to-dashboard")
    )
  }

  private async indexHomePage(): Promise<void> {
    // Go to settings
    await this.th.awaitAndClick(By.id("menu-settings"))
    // TODO: set site title and tagline
    // Go to Reading
    await this.th.awaitAndClick(By.xpath(`//a[contains(text(), "Reading")]`))
    // Click set static homepage
    await this.th.awaitAndClick(By.css(`input[value="page"]`))

    // Set homepage
    await this.th.awaitAndClick(
      By.xpath(`//option[contains(text(), "${this.pageName}")]`)
    )

    // Save changes
    await this.th.awaitAndClick(By.id("submit"))
    // Wait a sec
    await this.driver.sleep(2000)
  }

  private async activateAstra(): Promise<void> {
    // Open Appareance menu
    await this.th.awaitAndClick(By.id("menu-appearance"))

    // Activate
    await this.th.awaitAndClick(By.css(`a[aria-label="Activate Astra"]`))
  }

  private async connectAndActivateElementor(): Promise<void> {
    await this.th.awaitAndClick(By.css(".elementor-button"), 10000)

    try {
      await this.driver.wait(
        until.elementLocated(By.css(`select[name="license_id"]`)),
        10000
      )

      // wait a second, i guess it needs a minute
      await this.driver.sleep(2000)

      const elementorLicenseOptions = await this.driver.findElements(
        By.css(`select[name="license_id"] option`)
      )
      await this.driver
      elementorLicenseOptions[1].click()
    } catch (err) {
      // tslint:disable-next-line: no-console
      console.log(err)
      // tslint:disable-next-line: no-console
      console.log("||Defaulting activation||".yellow)
    }

    // Click activate
    await this.driver.wait(
      until.elementLocated(By.css(".elementor-button")),
      10000
    )
    await this.driver.findElement(By.css(".elementor-button")).click()
  }

  private async importTemplate(): Promise<void> {
    // Go to elmentor templates
    await this.th.awaitAndClick(By.id("menu-posts-elementor_library"))
    // click import template trigger
    // await driver.sleep(2000) // give it a sec
    await this.th.awaitAndClick(By.id("elementor-import-template-trigger"))
    // Enter tempalte
    await this.th.awaitAndSendKeys(
      By.css("#elementor-import-template-form-inputs input"),
      [
        path.resolve(
          "templates",
          TextUtils.slugify(this.currentDeal.companyName),
          "template.json"
        ),
      ]
    )
    // Submit
    await this.th.awaitAndClick(
      By.css(`#elementor-import-template-form-inputs input[type="submit"]`)
    )
  }

  private async catchNonSecuredWebsitePage(): Promise<void> {
    try {
      await this.driver.wait(
        until.elementLocated(By.css(".interstitial-wrapper")),
        2000
      )
      await this.th.awaitAndClick(By.id("details-button"))
      await this.th.awaitAndClick(By.id("proceed-link"))

      // tslint:disable-next-line: no-console
      console.log(
        `${this.currentDeal.companyName} (${this.currentDeal.domain}) was not secured`
          .red
      )
    } catch (err) {
      this.unsecruedDomains.push(this.currentDeal)
    }
  }

  private async loginElementor(): Promise<void> {
    await this.driver.get("https://my.elementor.com/login/?redirect_to=%2F")
    // Enter username
    await this.th.awaitAndSendKeys(By.id("login-input-email"), [
      process.env.ELEMENTOR_LOGIN_USERNAME as string,
    ])
    // Enter password
    await this.th.awaitAndSendKeys(By.id("login-input-password"), [
      process.env.ELEMENTOR_LOGIN_PASSWORD as string,
    ])
    await this.driver.sleep(1000) // give it a sec
    // Log in
    await this.th.awaitAndClick(By.css(".elementor-button.elementor-size-md"))
    // Verify login
    await this.driver.wait(
      until.elementLocated(By.css(".e-account-header")),
      this.waitTime
    )
  }

  private async restart(): Promise<void> {
    const tabs = await this.driver.getAllWindowHandles()
    if (tabs.length > 1) {
      await this.driver.close()
      await this.driver.switchTo().window(tabs[0])
    }
  }

  private logFailures(): void {
    if (this.failedDeals.length > 0) {
      this.spinner.stop()
      // tslint:disable-next-line: no-console
      console.log(`The following deals have failed:`.yellow)
      // tslint:disable-next-line: no-console
      console.log(
        this.failedDeals.map(failedDeal => failedDeal.companyName).join(`\n`)
          .red
      )
    } else {
      this.spinner.succeed()
      // tslint:disable-next-line: no-console
      console.log(AsciiArt.complete.rainbow)
      // tslint:disable-next-line: no-console
      console.log(
        "All wordpress configurations have been succsefully completed ✓".green
      )
    }
  }
}
