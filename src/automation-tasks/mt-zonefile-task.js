const { By, until, Key } = require("selenium-webdriver")

const ora = require("ora")

const selHelper = require("../utils/selenium-helpers")

const TaskHelper = require("../utils/task-helpers")

class MTZoneFileTask {
  loginDomain = "https://ap.www.namecheap.com/" // Default login domain for namecheap
  waitTime = 20000 // Default delay for an element to be found by the webdriver
  currentDeal = null // data of a single deal from the pipelinedeals api
  spinner = ora("Loading...")
  failedDeals = []
  unverifiedDomains = []
  sh
  /**
   *  Performs the tasks required to create a zonefile for each deal's domain provided
   * @param {WebDriver} driver The webdriver automating the webtakss
   * @param {Array} dealsData Array of deals to perform tasks one deal at a time
   */
  constructor(driver, dealsData) {
    this.driver = driver
    this.dealsData = dealsData

    // selHelper.init(this.driver, this.waitTime)
    this.sh = new selHelper(this.driver, this.waitTime)
  }

  async runTask() {
    this.spinner.color = "cyan"
    this.spinner.spinner = "dots"
    this.spinner.start()
    // login
    await this.logIntoNameCheap()
    await this.loginToMT()

    // Create zonefiles
    for (let i = 0; i < this.dealsData.length; i++) {
      this.spinner.text = `Currently working on ${this.dealsData[i].companyName}`
      try {
        await this.createZoneFile(this.dealsData[i])
      } catch (err) {
        console.log(err)
        this.failedDeals.push(this.dealsData[i])

        await this.driver.get("https://ac.mediatemple.net/home.mt")
      }
    }

    this.spinner.stop()

    TaskHelper.prototype.logCompletedFeedback(
      this.failedDeals,
      "All DNS zonefiles created succesfully"
    )

    if (this.unverifiedDomains.length > 0) {
      console.log(
        "The following domains timed out and weren't able to be verified within the time limit.  Please try them again at another time..."
          .yellow
      )
      console.log(
        this.unverifiedDomains
          .map(deal => `${deal.companyName} - ${deal.domain}`)
          .join("\n").red
      )
    }
  }

  // Login to the Media Temple interface
  async loginToMT() {
    // Open page
    await this.driver.get("https://ac.mediatemple.net/login.mt")
    // Enter credentials
    await this.sh.awaitAndSendKeys(
      By.id("primary_email"),
      process.env.MEDIATEMPLE_EMAIL
    )
    await this.sh.awaitAndSendKeys(
      By.id("ac_password"),
      process.env.MEDIATEMPLE_PASS
    )

    // Submit
    await this.driver.findElement(By.css(".btn--ac")).click()
  }

  async logIntoNameCheap() {
    // Open new tab
    await this.driver.findElement(By.tagName("body")).sendKeys
    // focus on new tab
    let loginDomain = "https://ap.www.namecheap.com/"
    // Enter login page
    await this.driver.get(loginDomain)
    // Enter login and pass
    await this.sh.awaitAndSendKeys(
      By.css(`.nc_username_required`),
      process.env.NAMECHEAP_USERNAME
    )
    await this.sh.awaitAndSendKeys(
      By.css(`.nc_password_required`),
      process.env.NAMECHEAP_PASSWORD
    )

    // Submit
    await this.sh.awaitAndClick(By.css(".nc_login_submit"))
  }

  /**
   * Creates a zonefile for the domain for the plesk server through the mediatemple interface
   * @param {Array} deal The current deal to create a zonefile for it's domain
   */
  async createZoneFile(currentDeal) {
    // Click Add A Domain
    await this.sh.awaitAndClick(By.css(".island .btn--ac"))

    //  Enter domain and select already own
    await this.sh.awaitAndSendKeys(By.id("domain"), currentDeal.domain)
    await this.sh.awaitAndClick(By.id("dontregister"))

    // Submit
    await this.sh.awaitAndClick(By.css(".btn-submit"))

    // Choose A Service
    // Select desired server
    await this.driver.wait(
      until.elementLocated(By.css(".fancyList-item input")),
      this.waitTime
    )
    await this.driver.sleep(1000)
    await this.sh.awaitAndClick(By.css(".fancyList-item input"))
    await this.sh.awaitAndClick(By.css(".grid-row button"))
    // Grab txtValue
    await this.driver.wait(
      until.elementLocated(By.xpath(`//td[contains(text(), "mt-")]`)),
      this.waitTime
    )
    let txtRecord = await this.driver
      .findElement(By.xpath(`//td[contains(text(), "mt-")]`))
      .getText()

    await this.ncDNSPointTo(txtRecord, currentDeal.domain)

    // await this.ncDNSPointTo()
    //* May require loop
    // Verify domain ownership
    let attempts = 0 // amount of attempts to try and verify
    while (attempts < 3) {
      try {
        await this.driver.sleep(5000)
        await this.sh.awaitAndClick(By.id("verifyButton"))
        await this.driver.wait(
          until.elementLocated(By.css(".welcomeBar-message")),
          5000
        )
        attempts = 10
      } catch (err) {
        console.log("verify failed".red)
        attempts++
        if (attempts == 2) {
          this.unverifiedDomains.push(currentDeal)
        }
      }
    }
    await this.driver.wait(
      until.elementLocated(By.css(".welcomeBar-message")),
      this.waitTime
    )
  }

  async ncDNSPointTo(txtRecord, domain) {
    // open new tab and enter namcheap domains list
    await this.driver.executeScript(
      `window.open("https://ap.www.namecheap.com/domains/list", "_blank")`
    )
    let currentTabs = await this.driver.getAllWindowHandles()
    await this.driver.switchTo().window(currentTabs[1])

    // search for domain to manage
    await this.sh.awaitAndSendKeys(
      By.css(`input.gb-form-control[placeholder="Search"]`),
      domain
    )
    await this.driver.sleep(2000)
    await this.sh.awaitAndClick(
      By.xpath(`//table//a[contains(text(), "Manage")]`)
    )
    // enter DNS tab and provide the TXT record
    await this.sh.awaitAndClick(By.css(".advanced-dns"))
    // Set catagory as TXT
    await this.driver.wait(
      until.elementLocated(
        By.xpath(`//span[contains(text(), "Host Records")]`)
      ),
      this.waitTime
    )

    await this.driver.sleep(2000)
    await this.sh.awaitAndClick(
      By.xpath(`//p[contains(text(), "CNAME Record")]`)
    )

    await this.sh.awaitAndClick(
      By.xpath(`//div[contains(text(), "TXT Record")]`)
    )
    await this.driver.sleep(250) // give it a sec
    await this.driver
      .findElement(By.xpath(`//p[contains(text(), "URL Redirect Record")]`))
      .click()

    await this.sh.awaitAndClick(
      By.xpath(`//div[contains(text(), "TXT Record")]`)
    )
    // Enter txt field values
    await this.driver.wait(until.elementLocated(By.css(`input[name="txt"]`)))
    let txtFieldsEl = await this.driver.findElements(
      By.css(`input[name="txt"]`)
    )
    await txtFieldsEl[0].clear()
    await txtFieldsEl[0].sendKeys(txtRecord)
    await txtFieldsEl[1].clear()
    await txtFieldsEl[1].sendKeys(txtRecord)

    // save
    let saveEls = await this.driver.findElements(By.css("tbody .save"))
    await saveEls[0].click()
    await saveEls[1].click()
    await this.driver.sleep(2000) // wait a sec

    //? Skipping for now
    // switch back to home tab and enter name servers
    // Set name servers
    // await this.sh.awaitAndClick(By.css(".domain a"))
    // await this.sh.awaitAndClick(By.css("div.nameservers-row a.select2-choice"))
    // await this.sh.awaitAndClick(
    //   By.xpath(`//div[contains(text(), "Custom DNS")]`)
    // )
    // await this.sh.awaitAndSendKeys(By.css("#record0"), "ns1.mediatemple.net")
    // await this.sh.awaitAndSendKeys(By.css("#record1"), "ns2.mediatemple.net")
    // await this.sh.awaitAndClick(By.css(".save"))
    // submit - wait a few - close tab  and

    // await this.driver.sleep(2000)
    await this.driver.close()
    await this.driver.switchTo().window(currentTabs[0])
  }
}

module.exports = MTZoneFileTask
