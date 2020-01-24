import webdriver, { WebDriver } from "selenium-webdriver"
import chrome from "selenium-webdriver/chrome"
import { path as chromePath } from "chromedriver"
import { DriverService } from "selenium-webdriver/remote"

import prompts, { Answers } from "prompts"
import colors from "colors"

/**
 *
 */
class Main {
  private driver: WebDriver
  private choice: number
  private pipelineData: object[]

  /**
   * Main driver for webtask automation
   */
  constructor() {}

  /**
   * Initalizer
   */
  async init() {
    await this.runTask()
  }

  /**
   * Begin web automation
   */
  async runTask() {
    await this.createWebDriver()
    console.log("whao")
  }

  /**
   * Create the main webdriver for performing webtasks
   */
  async createWebDriver() {
    const service: DriverService = await new chrome.ServiceBuilder(
      chromePath
    ).build()
    chrome.setDefaultService(service)

    this.driver = await new webdriver.Builder()
      .withCapabilities(webdriver.Capabilities.chrome())
      .build()

    await this.driver
      .manage()
      .window()
      .setRect({ width: 1400, height: 980, x: 0, y: 0 })
  }

  /**
   * Acquires the data fetched from the PipelineDeals API
   */
  async acquireData() {}

  async initialPrompt() {
    const choicesPromptText: string = `
Please select a buildout process.  All buildouts to run are received from the company_names.json file.  
If you already haven't done so, please enter the data into that file with the desired deals to proces buildouts for.
1. Create DNS zonefiles
2. Point Nameservers
3. Website Purchase
4. Buildout
(Select a Number):`.cyan
    const choicePrompt: Answers<"choice"> = await prompts({
      type: "number",
      name: "choice",
      message: choicesPromptText,
    })

    this.choice = choicePrompt.choice
  }

  /**
   * Will run task depending on which choice the user has selected
   * @param choice Number to decide with task to run
   */
  async chooseRoute(choice: number) {
    switch (choice) {
      case 1:
        console.log("Choice 1 made")
        break
      default:
        console.log("No choice made")
    }
  }
}

new Main().init()
