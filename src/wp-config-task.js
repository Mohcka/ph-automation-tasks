const { By, Key, until } = require("selenium-webdriver")

const selHelper = require("./selenium-helpers")
const taskHelper = require("./task-helpers")
const { awaitAndClick, awaitAndSendKeys } = require("./selenium-helpers")

let driver = null
let WAIT_TIME = null
let currentDeal = null

let tabs = null

let pageName = "Test"

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
    currentDeal = domainsList[i]

    // Login deal wordpress
    await loginWP()

    await driver.sleep(5000)

    // Set as homepage
    await indexHomePage()
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
  tabs = await driver.getAllWindowHandles()
  await driver.switchTo().window(tabs[1])
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

module.exports = { runWpPreconfig }
