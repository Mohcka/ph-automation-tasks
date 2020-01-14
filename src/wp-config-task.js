const path = require("path")

const { By, Key, until } = require("selenium-webdriver")

const selHelper = require("./selenium-helpers")
const taskHelper = require("./task-helpers")
const { awaitAndClick, awaitAndSendKeys } = require("./selenium-helpers")

const colors = require("colors")

let driver = null
let WAIT_TIME = null
let currentDeal = null

// let tabs = null

let pageName = "Test"

let failLogs = []

/**
 * Main function to run the prebuildout tasks
 * @param {Builder} pulleDriver -
 * @param {Array}   domainList  - list of domains to create throuh plesk
 */
const runWpPreconfig = async (pulledDriver, domainsList) => {
  driver = pulledDriver
  WAIT_TIME = 60000
  selHelper.init(driver, WAIT_TIME)
  taskHelper.init(driver, WAIT_TIME)
  await driver.get("https://dh52-ylwp.accessdomain.com:8443/")

  // Login Plesk
  selHelper.loginPlesk()

  // looping through buildouts
  for (let i = 0; i < domainsList.length; i++) {
    try {
      currentDeal = domainsList[i]

      // Login deal wordpress
      await loginWP()

      // Upload elementor
      await uploadPlugins()
      // Creating homepage
      await createHomePage()

      // Set as homepage
      await indexHomePage()
      // Close tab and go back to plesk
      await restart()
    } catch (err) {
      failLogs.push(currentDeal)
      // close tab and go back to main tab if wordpres was opened prior
      await restart()
    }
  }

  if (failLogs.length > 0) {
    console.log(`The following deals have faileld:`.yellow)
    console.log(
      failLogs.map(failedDeal => failedDeal.companyName).join(`\n`).red
    )
  }
}

async function loginWP() {
  // Goto domains
  await awaitAndClick(By.css(".nav-domains a"))
  // Enter target domain page
  await taskHelper.pullUpDomainPageFor(currentDeal.domain)
  // Login to wordpress
  await awaitAndClick(
    By.xpath(
      `//div[@class="caption-service-toolbar"]/a[contains(text(), "Log In")]`
    )
  )

  // Switch tab to wordpress
  const tabs = await driver.getAllWindowHandles()
  await driver.switchTo().window(tabs[1])
}

async function createHomePage() {
  // Enter Pages page
  await awaitAndClick(By.id(`menu-pages`))
  // Add new page
  await awaitAndClick(
    By.xpath(`//div[@class="wrap"]//a[contains(text(), "Add New")]`)
  )
  // Enter "Home" in title
  await awaitAndSendKeys(By.id("post-title-0"), "Test")
  // Configure settings to work with elementor
  // Disable all sections
  let disableInputs = await driver.findElements(
    By.css(".disable-section-meta input")
  )
  for (let i = 0; i < disableInputs.length; i++) {
    await disableInputs[i].click()
  }
  // Apply no sidebar
  await awaitAndClick(By.css(`option[value="no-sidebar"]`))
  // Apply full width content layout
  await awaitAndClick(By.css(`option[value="page-builder"]`))

  // Open page attributes and select Elementor Canvas template
  await awaitAndClick(By.xpath(`//button[contains(text(), "Page Attributes")]`))
  await awaitAndClick(By.css(`option[value="elementor_canvas"]`))
  // publish
  await awaitAndClick(By.css(".editor-post-publish-panel__toggle"))
  // Do it again!
  await awaitAndClick(By.css(".editor-post-publish-button"))

  // Wait for page to be published
  await driver.wait(
    until.elementLocated(By.xpath(`//*[contains(text(), "Published")]`)),
    WAIT_TIME
  )
}

async function indexHomePage() {
  // Go to settings
  await awaitAndClick(By.id("menu-settings"))
  //TODO: set site title and tagline
  // Go to Reading
  await awaitAndClick(By.xpath(`//a[contains(text(), "Reading")]`))
  // Set homepage
  await awaitAndClick(By.xpath(`//option[contains(text(), "${pageName}")]`))
  // Save changes
  await awaitAndClick(By.id("submit"))
}

async function uploadPlugins() {
  // goto plugins
  await awaitAndClick(By.id("menu-plugins"))
  // click add new
  await awaitAndClick(By.css(".page-title-action"))
  // click upload plugin
  await awaitAndClick(By.css(".upload-view-toggle"))
  // upload file
  await awaitAndSendKeys(
    By.id("pluginzip"),
    path.resolve("./public/plugins/elementor-pro-2.7.2.zip")
  )
}
/**
 * Closes the wordpress tab and restarts the process
 */
async function restart() {
  const tabs = await driver.getAllWindowHandles()
  if(tabs.length > 1) {
    await driver.close()
    await driver.switchTo().window(tabs[0])
  }
}

module.exports = { runWpPreconfig }
