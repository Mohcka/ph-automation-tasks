const path = require("path")

const { By, Key, until } = require("selenium-webdriver")

const SelHelper = require("../utils/selenium-helpers")
const taskHelper = require("../utils/task-helpers")
const { runTemplateGen } = require("../template-generator")
const { slugify } = require("../utils/text-utils")

const colors = require("colors")
const ora = require("ora")
const asciiArt = require("../utils/ascii-art")

let driver = null
let WAIT_TIME = null
let currentDeal = null

// let tabs = null

let pageName = "Home"

let failLogs = []
let sh, th
const spinner = ora("Loading...")

/**
 * Main function to run the prebuildout tasks
 * @param {Builder} pulleDriver -
 * @param {Array}   domainList  - list of domains to create throuh plesk
 */
const runWpPreconfig = async (pulledDriver, dealsData) => {
  driver = pulledDriver
  WAIT_TIME = 60000
  sh = new SelHelper(driver, WAIT_TIME)
  // SelHelper.init(driver, WAIT_TIME)
  th = new taskHelper(driver, WAIT_TIME)
  spinner.color = "cyan"
  spinner.spinner = "dots"
  spinner.start()

  // Boolean to determine if the current task has failed
  // let taskFailed = false

  // Create templates
  await runTemplateGen(dealsData)

  try {
    await loginElementor()
  } catch (err) {
    console.log("Failed to login to Elementor [NE]".red)
  }

  // Login Plesk
  await th.loginPlesk()

  // looping through buildouts
  for (let i = 0; i < dealsData.length; i++) {
    try {
      currentDeal = dealsData[i]
      spinner.text = `Now working on ${currentDeal.companyName}`
      // currentDeal.domain = "getpagehubgrid.com" // For testing purposes

      // Login deal wordpress
      await loginWP()
      await catchNonSecuredWebsitePage()

      // Activate Elementor Pro
      try {
        await connectAndActivateElementor()
      } catch (err) {
        console.log(
          `Elementor seems to be already activated for ${currentDeal.domain}`
            .yellow
        )
      }

      // import theme
      await importTemplate()

      try {
        await activateAstra()
      } catch (err) {
        console.log(
          "Astra activation failed.  It may have already be installed".yellow
        )
      }
      // Upload elementor
      // Creating homepage
      await createHomePage()

      // Set as homepage
      await indexHomePage()
      // Close tab and go back to plesk
      await restart()
    } catch (err) {
      failLogs.push(currentDeal)
      console.log(err)
      // close tab and go back to main tab if wordpres was opened prior
      await restart()
    }
  }
  spinner.stop()

  if (failLogs.length > 0) {
    console.log(`The following deals have failed:`.yellow)
    console.log(
      failLogs.map(failedDeal => failedDeal.companyName).join(`\n`).red
    )
  } else {
    console.log(asciiArt.complete.rainbow)
    console.log(
      "All wordpress configurations have been succsefully completed ✓".green
    )
  }
}

async function loginWP() {
  // Goto domains
  await sh.awaitAndClick(By.css(".nav-domains a"))
  // Enter target domain page
  await th.pullUpDomainPageFor(currentDeal.domain)
  // Login to wordpress
  await sh.awaitAndClick(
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
  await sh.awaitAndClick(By.id(`menu-pages`))
  // Add new page
  await sh.awaitAndClick(
    By.xpath(`//div[@class="wrap"]//a[contains(text(), "Add New")]`)
  )
  // Enter "Home" in title
  await sh.awaitAndSendKeys(By.id("post-title-0"), pageName)
  // Configure settings to work with elementor
  // Disable all sections
  let disableInputs = await driver.findElements(
    By.css(".disable-section-meta input")
  )
  for (let i = 0; i < disableInputs.length; i++) {
    await disableInputs[i].click()
  }
  // Apply no sidebar
  await sh.awaitAndClick(By.css(`option[value="no-sidebar"]`))
  // Apply full width content layout
  await sh.awaitAndClick(By.css(`option[value="page-builder"]`))

  // Open page attributes and select Elementor Canvas template
  await sh.awaitAndClick(
    By.xpath(`//button[contains(text(), "Page Attributes")]`)
  )
  await sh.awaitAndClick(By.css(`option[value="elementor_canvas"]`))
  // publish
  await sh.awaitAndClick(By.css(".editor-post-publish-panel__toggle"))
  // Do it again!
  await driver.sleep(1000)
  await sh.awaitAndClick(By.css(".editor-post-publish-button"))

  // Wait for page to be published
  await driver.wait(
    until.elementLocated(By.xpath(`//*[contains(text(), "Published")]`)),
    WAIT_TIME
  )

  // Apply Elementor Page
  await applyElementorPage()
}

async function applyElementorPage() {
  // Immplying we're already on the wp edit page for the current page, start elementor buildout
  // Apply elementor
  await sh.awaitAndClick(By.id("elementor-switch-mode-button"))
  // insert template
  let elAddTemplate = By.css(".elementor-add-template-button")
  let elementorIframeLocator = By.id("elementor-preview-iframe")
  // await driver.wait(until.elementLocated(elAddTemplate), WAIT_TIME)
  let passed = false

  // console.log(await driver.getAllWindowHandles())

  await driver.wait(
    until.ableToSwitchToFrame(elementorIframeLocator),
    WAIT_TIME
  )
  await driver.switchTo().defaultContent()

  // find element
  let elementorIframeEl = await driver.findElement(elementorIframeLocator)
  await driver.switchTo().frame(elementorIframeEl)

  await driver.findElement(elAddTemplate).click()

  await driver.switchTo().defaultContent()

  await sh.awaitAndClick(By.xpath(`//div[contains(text(), "My Templates")]`))
  await sh.awaitAndClick(
    By.xpath(
      `//div[contains(text(), "${currentDeal.companyName} Template")]/..//button`
    )
  )
  await driver.sleep(2000) // give it a sec
  // Update the page
  await sh.awaitAndClick(By.id("elementor-panel-saver-button-publish"))
  await driver.wait(
    until.elementLocated(
      By.css("#elementor-panel-saver-button-publish.elementor-disabled")
    )
  )
  // head back out to wp
  await sh.awaitAndClick(By.css(".elementor-header-button"))
  await sh.awaitAndClick(By.css(".elementor-panel-menu-item-exit-to-dashboard"))
}

async function indexHomePage() {
  // Go to settings
  await sh.awaitAndClick(By.id("menu-settings"))
  //TODO: set site title and tagline
  // Go to Reading
  await sh.awaitAndClick(By.xpath(`//a[contains(text(), "Reading")]`))
  // Click set static homepage
  await sh.awaitAndClick(By.css(`input[value="page"]`))

  // Set homepage
  await sh.awaitAndClick(By.xpath(`//option[contains(text(), "${pageName}")]`))

  // Save changes
  await sh.awaitAndClick(By.id("submit"))
  // Wait a sec
  await driver.sleep(2000)
}

async function uploadPlugins() {
  // goto plugins
  await sh.awaitAndClick(By.id("menu-plugins"))
  // click add new
  await sh.awaitAndClick(By.css(".page-title-action"))
  // click upload plugin
  await sh.awaitAndClick(By.css(".upload-view-toggle"))
  // upload file
  await sh.awaitAndSendKeys(
    By.id("pluginzip"),
    path.resolve("./public/plugins/elementor-pro-2.7.2.zip")
  )
}

/**
 * Installs the astra theme for the wordpress installation
 */
async function installTheme() {
  // Open Appareance menu
  await sh.awaitAndClick(By.id("menu-appearance"))
  // click add new
  await sh.awaitAndClick(
    By.xpath(`//div[@class="wrap"]//a[contains(text(), "Add New")]`)
  )
  // search for and find astra
  const wpThemeSearchElement = By.id("wp-filter-search-input")
  await driver.wait(until.elementLocated(wpThemeSearchElement), WAIT_TIME)
  await driver
    .actions()
    .click(wpThemeSearchElement)
    .sendKeys("Astra", Key.ENTER)
    .perform()
  // Install
  await sh.awaitAndClick(By.css(`a[aria-label="Install Astra"]`))
  // Activate
  await sh.awaitAndClick(By.css(`a[aria-label="Activate Astra"]`))
}

async function activateAstra() {
  // Open Appareance menu
  await sh.awaitAndClick(By.id("menu-appearance"))

  // Activate
  await sh.awaitAndClick(By.css(`a[aria-label="Activate Astra"]`))
}

async function loginElementor() {
  await driver.get("https://my.elementor.com/login/?redirect_to=%2F")
  // Enter username
  await sh.awaitAndSendKeys(
    By.id("login-input-email"),
    process.env.ELEMENTOR_LOGIN_USERNAME
  )
  // Enter password
  await sh.awaitAndSendKeys(
    By.id("login-input-password"),
    process.env.ELEMENTOR_LOGIN_PASSWORD
  )
  // Log in
  await sh.awaitAndClick(By.css(".elementor-button.elementor-size-md"))
  // Verify login
  await driver.wait(
    until.elementLocated(By.css(".e-account-header")),
    WAIT_TIME
  )
}

async function connectAndActivateElementor() {
  await sh.awaitAndClick(By.css(".elementor-button"), 10000)

  try {
    await driver.wait(
      until.elementLocated(By.css(`select[name="license_id"]`)),
      10000
    )

    // wait a second, i guess it needs a minute
    await driver.sleep(2000)

    let elementorLicenseOptions = await driver.findElements(
      By.css(`select[name="license_id"] option`)
    )
    await driver
    elementorLicenseOptions[1].click()
  } catch (err) {
    console.log(err)
    console.log("||Defaulting activation||".yellow)
  }

  // Click activate
  await driver.wait(until.elementLocated(By.css(".elementor-button")), 10000)
  await driver.findElement(By.css(".elementor-button")).click()
}

async function importTemplate() {
  // Go to elmentor templates
  await sh.awaitAndClick(By.id("menu-posts-elementor_library"))
  // click import template trigger
  // await driver.sleep(2000) // give it a sec
  await sh.awaitAndClick(By.id("elementor-import-template-trigger"))
  // Enter tempalte
  await sh.awaitAndSendKeys(
    By.css("#elementor-import-template-form-inputs input"),
    path.resolve("templates", slugify(currentDeal.companyName), "template.json")
  )
  // Submit
  await sh.awaitAndClick(
    By.css(`#elementor-import-template-form-inputs input[type="submit"]`)
  )
}

async function catchNonSecuredWebsitePage() {
  try {
    await driver.wait(
      until.elementLocated(By.css(".interstitial-wrapper")),
      2000
    )
    await sh.awaitAndClick(By.id("details-button"))
    await sh.awaitAndClick(By.id("proceed-link"))

    console.log(
      `${currentDeal.companyName} (${currentDeal.domain}) was not secured`.red
    )
  } catch (err) {}
}

/**
 * Closes the wordpress tab and restarts the process
 */
async function restart() {
  const tabs = await driver.getAllWindowHandles()
  if (tabs.length > 1) {
    await driver.close()
    await driver.switchTo().window(tabs[0])
  }
}

module.exports = { runWpPreconfig }
