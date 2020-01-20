const { By, until } = require("selenium-webdriver")
const colors = require("colors")

const selHelper = require("../utils/selenium-helpers")

const asciiArt = require("../utils/ascii-art")

class DNSTask {
  loginDomain = "https://ap.www.namecheap.com/" // Default login domain for namecheap
  waitTime = 60000 // Default delay for an element to be found by the webdriver
  currentDeal = null // data of a single deal from the pipelinedeals api
  failedDeals = []
  sh

  constructor(driver, dealsData) {
    this.driver = driver
    this.dealsData = dealsData

    // selHelper.init(this.driver, this.waitTime)
    this.sh = new selHelper(driver, this.waitTime)
  }

  /**
   * Begin the automation for some fun
   */
  async runTask() {
    await this.logIntoNameCheap()
    await this.applyNameCheapNameServers()
  }

  /**
   * Logs into the namecheap service
   */
  async logIntoNameCheap() {
    // Enter login page
    await this.driver.get(this.loginDomain)
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
   * Point domains for each of name servers
   */
  async applyNameCheapNameServers() {
    await this.sh.awaitAndClick(By.css(".domains"))

    for (let i = 0; i < this.dealsData.length; i++) {
      this.currentDeal = this.dealsData[i]
      try {
        // search for domain to manage
        await this.sh.awaitAndSendKeys(
          By.css(`input.gb-form-control[placeholder="Search"]`),
          this.currentDeal.domain
        )
        await this.driver.sleep(2000)
        await this.sh.awaitAndClick(
          By.xpath(`//table//a[contains(text(), "Manage")]`)
        )
        // Set name servers
        await this.sh.awaitAndClick(
          By.xpath(`//*[contains(text(), "Namecheap BasicDNS")]/..`)
        )
        await this.sh.awaitAndClick(
          By.xpath(`//div[contains(text(), "Custom DNS")]`)
        )
        await this.sh.awaitAndSendKeys(
          By.css("#record0"),
          "ns1.mediatemple.net"
        )
        await this.sh.awaitAndSendKeys(
          By.css("#record1"),
          "ns2.mediatemple.net"
        )
        await this.sh.awaitAndClick(By.css(".save"))
        // Go backto domain list
        await this.sh.awaitAndClick(By.css(".domains"))
      } catch (err) {
        this.failedDeals.push(this.currentDeal)
        console.log(err)

        // Go back to domains list
        await this.driver.get("https://ap.www.namecheap.com/domains/list")
      }
    }

    console.log(asciiArt.complete.rainbow)

    if (this.failedDeals.length > 0) {
      console.log("The following deals have failed".yellow)
      console.log(
        this.failedDeals
          .map(failedDeal => `${failedDeal.companyName} - ${failedDeal.domain}`)
          .join(`\n`).red
      )
    } else {
      console.log(
        "All the domains have had their DNS pointed succesfully!".green
      )
    }
  }
}

module.exports = DNSTask
