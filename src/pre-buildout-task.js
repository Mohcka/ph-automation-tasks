const { By, Key, until } = require("selenium-webdriver")

const selHelper = require("./selenium-helpers")
const { awaitAndClick, awaitAndSendKeys } = require("./selenium-helpers")

let driver = null
const WAIT_TIME = 30000 // 5 seconds

module.exports.runBuildout = async pulledDriver => {
  driver = pulledDriver
  selHelper.init(driver, WAIT_TIME)
  await driver.get("https://dh52-ylwp.accessdomain.com:8443/")

  // Login
  loginPlesk()

  //TODO: Begin looping through buildouts

  await createNewDomain()
  // await driver.get("https://dh52-ylwp.accessdomain.com:8443/admin/domain/")
  await installWordpress()
}

// Sign into Plesk interface
async function loginPlesk() {
  await awaitAndSendKeys(
    By.css("#loginSection-username"),
    process.env.PLESK_USERNAME
  )

  // Enter passwaored
  await driver
    .findElement(By.css("#loginSection-password"))
    .sendKeys(process.env.PLESK_PASSWORD)

  // Submit
  await driver.findElement(By.css("#btn-send")).click()
}

async function createNewDomain() {
  // Goto domains
  await awaitAndClick(By.css(".nav-domains a"))
  // Create new domain
  await awaitAndClick(By.css("#buttonAddDomain"))
  // Enter Info
  // Domain name
  await awaitAndSendKeys(By.id(`domainName-name`), "example.com")
  // Username
  await awaitAndSendKeys(By.id(`domainInfo-userName`), "example")
  // Password
  await awaitAndSendKeys(
    By.id(`domainInfo-password`),
    process.env.DOMAIN_ADMIN_PASSWORD
  )
  // Password Again
  await awaitAndSendKeys(
    By.id(`domainInfo-passwordConfirmation`),
    process.env.DOMAIN_ADMIN_PASSWORD
  )
  // Let's encrypt it
  await awaitAndClick(By.id("sslit-enabled"))

  // Submit domain
  await awaitAndClick(By.id("btn-send"))
}

async function installWordpress() {
  // Implying we're at the domains page
  // Enter domain of intereidst in search
  await awaitAndSendKeys(
    By.id("domains-list-search-text-domainName"),
    "example.com"
  )
  await driver.findElement(By.css(".search-field em")).click()

  await driver.sleep(2000)
  await awaitAndClick(By.css("#domains-list-container .odd td a"))

  // Initiate wordpress install
  await awaitAndClick(By.css(".btn.js-wp-install"))
  // Select Elementor Plugin Set
  // await awaitAndClick(By.xpath(`//select[@name="setId"]`))
  await awaitAndClick(
    By.xpath(`//select/option[contains(text(), "Elementor")]`)
  )

  // Enter Title
  await driver.findElement(By.xpath(`//input[@name="title"]`)).clear()
  await awaitAndSendKeys(By.xpath(`//input[@name="title"]`), "Website Title")
  // Enter username
  await driver.findElement(By.xpath(`//input[@name="adminUserName"]`)).clear()
  await awaitAndSendKeys(
    By.xpath(`//input[@name="adminUserName"]`),
    "websitesupport"
  )

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
  await awaitAndClick(
    By.css(`button[data-test-id="instance-install-form-submit-button"]`)
  )

  // Installation complete, close prompt
  await awaitAndClick(By.xpath(`//span[contains(text(), "No, thanks")]/../..`))
}
