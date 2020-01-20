const { By, Key, until } = require("selenium-webdriver")

const colors = require("colors")
const asciiArt = require("../utils/ascii-art")

const selHelper = require("../utils/selenium-helpers")
const TaskHelper = require("../utils/task-helpers")

let driver = null
let WAIT_TIME = null
let currentDeal = null

let failedDeals = []

let sh = null,
  th = null

/**
 * Main function to run the prebuildout tasks
 * @param {Builder} pulleDriver -
 * @param {Array}   domainList  - list of domains to create throuh plesk
 */
const runPreBuildout = async (pulledDriver, dealList) => {
  driver = pulledDriver
  WAIT_TIME = 20000
  sh = new selHelper(driver, WAIT_TIME)
  // selHelper.init(driver, WAIT_TIME)
  th = new TaskHelper(driver, WAIT_TIME)
  await driver.get("https://dh52-ylwp.accessdomain.com:8443/")

  // Login
  await th.loginPlesk()

  // looping through buildouts
  for (let i = 0; i < dealList.length; i++) {
    currentDeal = dealList[i]
    // currentDeal.domain = "example.com"

    try {
      await createNewDomain()
      await installWordpress()
      // await addTheme()
    } catch (err) {
      failedDeals.push(currentDeal)
      console.error(`Err on: ${currentDeal.companyName}`)
      console.error(err)
      // Go back to main page
      await driver.get("https://dh52-ylwp.accessdomain.com:8443/")
    }
  }

  if (failedDeals.length > 0) {
    console.log(`The following deals have failed:`.yellow)
    console.log(
      failedDeals
        .map(failedDeal => `${failedDeal.companyName} - ${failedDeal.domain}`)
        .join(`\n`).red
    )
  } else {
    console.log(asciiArt.complete.rainbow)
    console.log("All deals prebuilt successfully ✓".green)
  }
}

async function createNewDomain() {
  // Goto domains
  await sh.awaitAndClick(By.css(".nav-domains a"))
  // Create new domain
  await sh.awaitAndClick(By.css("#buttonAddDomain"))
  // ##Enter Info
  // Domain name
  await sh.awaitAndSendKeys(By.id(`domainName-name`), currentDeal.domain)
  // Username
  await sh.awaitAndSendKeys(
    By.id(`domainInfo-userName`),
    currentDeal.domain.match(/(.*)\./)[1]
  )
  // Password
  await sh.awaitAndSendKeys(
    By.id(`domainInfo-password`),
    process.env.DOMAIN_ADMIN_PASSWORD
  )
  // Password Again
  await sh.awaitAndSendKeys(
    By.id(`domainInfo-passwordConfirmation`),
    process.env.DOMAIN_ADMIN_PASSWORD
  )
  // Let's encrypt it
  await sh.awaitAndClick(By.id("sslit-enabled"))

  // Submit domain
  await sh.awaitAndClick(By.id("btn-send"))
}

async function installWordpress() {
  // Implying we're at the domains page
  // Enter domain of interest in search
  await driver.wait(
    until.elementLocated(By.id("domains-list-search-text-domainName")),
    WAIT_TIME
  )
  await driver.findElement(By.id("domains-list-search-text-domainName")).clear()
  await sh.awaitAndSendKeys(
    By.id("domains-list-search-text-domainName"),
    currentDeal.domain
  )
  await driver.findElement(By.css(".search-field em")).click()

  await driver.sleep(2000)
  await sh.awaitAndClick(By.css("#domains-list-container .odd td a"))

  // Initiate wordpress install
  await sh.awaitAndClick(By.css(".btn.js-wp-install"))
  // Select Elementor Plugin Set
  // await sh.awaitAndClick(By.xpath(`//select[@name="setId"]`))
  await sh.awaitAndClick(
    By.xpath(`//select/option[contains(text(), "Elementor")]`)
  )

  // Enter Title
  await driver.findElement(By.xpath(`//input[@name="title"]`)).clear()
  await sh.awaitAndSendKeys(
    By.xpath(`//input[@name="title"]`),
    currentDeal.companyName
  )
  // Enter username
  let usernameElement = await driver.findElement(
    By.xpath(`//input[@name="adminUserPassword"]`)
  )
  await driver
    .actions()
    .doubleClick(usernameElement)
    .sendKeys("websitesupport")
    .perform()

  // password

  // await driver
  //   .findElement(By.xpath(`//input[@name="adminUserPassword"]`))
  //   .click()
  let passwordFieldElement = await driver.findElement(
    By.xpath(`//input[@name="adminUserPassword"]`)
  )
  await driver
    .actions()
    .doubleClick(passwordFieldElement)
    .sendKeys(process.env.DOMAIN_ADMIN_PASSWORD)
    .perform()

  // Install
  await sh.awaitAndClick(
    By.css(`button[data-test-id="instance-install-form-submit-button"]`)
  )

  // Installation complete, close prompt
  await sh.awaitAndClick(
    By.xpath(`//span[contains(text(), "No, thanks")]/../..`)
  )
}

async function addTheme() {
  // Goto domains and pull up the deal's domain page
  await th.pullUpDomainPageFor(currentDeal.domain)
  // Go to themes section
  await sh.awaitAndClick(By.xpath(`//a[contains(text(), "Themes")]`))

  // Install astra
  await sh.awaitAndClick(
    By.xpath(
      `//span[contains(text(), "Astra")]/../../../..//button[@data-test-id="plugendio-install-button"]`
    )
  )
  // Wait for it to install
  await driver.wait(
    until.elementLocated(
      By.xpath(
        `//span[contains(text(), "Astra")]/../../../..//span[@class="pul-text pul-text--success"]`
      )
    )
  )

  // Close theme slideout
  await sh.awaitAndClick(By.css(".pul-drawer-header button"))
  //TODO: wait it out for now
  await driver.sleep(2000)
}

module.exports = { runPreBuildout }
