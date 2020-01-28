import { config } from "dotenv"
config()

import webdriver, { WebDriver } from "selenium-webdriver"
import chrome from "selenium-webdriver/chrome"
import { DriverService } from "selenium-webdriver/remote"
import { path as chromePath } from "chromedriver"

import prompts, { Answers, PromptObject } from "prompts"
import colors from "colors"

import MTZoneFileTaskRunner from "./src/automation-tasks/MTZoneFileTaskRunner"

import PLDataFetcher, { PipelineDataCollection } from "./src/DealDataFetcher"
import DNSTaskRunner from "./src/automation-tasks/DNSTaskRunner"
import PrebuildoutTaskRunner from "./src/automation-tasks/PrebuildoutTaskRunner"
import WPTaskRunner from "./src/automation-tasks/WPConfigTaskRunner"

/**
 *
 */
class Main {
  private driver: WebDriver
  private choice: number
  private fetchedPLData: PipelineDataCollection

  /**
   * Main driver for webtask automation
   */
  // tslint:disable-next-line: no-empty
  constructor() {}

  /**
   * Begin web automation by giving the user a choice
   */
  async run() {
    const choicesPromptText: string = `
Please select a buildout process.  All buildouts to run are received from the company_names.json file.
If you already haven't done so, please enter the data into that file with the desired deals to proces buildouts for.
1. Create DNS zonefiles
2. Website Purchase
3. Buildout Wordpress Installation
(Select a Number):`
    const choicePrompt: Answers<"choice"> = await prompts({
      type: "number",
      name: "choice",
      message: colors.cyan(choicesPromptText),
    })

    this.choice = choicePrompt.choice
    // acquire data and create webdriver
    this.fetchedPLData = await PLDataFetcher.fetchData()

    await this.createWebDriver()

    try {
      switch (this.choice) {
        case 1:
          // tslint:disable-next-line: no-console
          await new MTZoneFileTaskRunner(
            this.driver,
            this.fetchedPLData
          ).runTask()
          await new DNSTaskRunner(this.driver, this.fetchedPLData).runTask()
          break

        // case 2:
        //   await new DNSTaskRunner(this.driver, this.fetchedPLData).runTask()
        //   break
        case 2:
          await new PrebuildoutTaskRunner(this.driver, this.fetchedPLData).runTask()
          break
        case 3:
          await new WPTaskRunner(this.driver, this.fetchedPLData).runTask()
          break
        default:
          // tslint:disable-next-line: no-console
          console.log("The wrong choice".red)
      }
    } finally {
      await this.driver.quit()
    }
  }

  /**
   * Create the main webdriver for performing webtasks
   */
  async createWebDriver() {
    // Configure the default service
    const service: DriverService = await new chrome.ServiceBuilder(
      chromePath
    ).build()
    chrome.setDefaultService(service)

    // create the drirver
    this.driver = await new webdriver.Builder()
      .withCapabilities(webdriver.Capabilities.chrome())
      .build()

    // Resize driver
    await this.driver
      .manage()
      .window()
      .setRect({ width: 1400, height: 980, x: 0, y: 0 })
  }
}

new Main().run()
