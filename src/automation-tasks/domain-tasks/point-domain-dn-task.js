const { By, Key, until } = require("selenium-webdriver")

const colors = require("colors")

const selHelper = require("./selenium-helpers")
const { awaitAndClick, awaitAndSendKeys } = require("./selenium-helpers")
const taskHelper = require("./task-helpers")
const { pullUpDomainPageFor } = require("./task-helpers")

let driver = null
let WAIT_TIME = null
let currentDeal = null

let failedDeals = []

async function runDomainTask (pulledDriver, domainsList) {
  driver = pulledDriver
  WAIT_TIME = 60000
  selHelper.init(driver, WAIT_TIME)
  taskHelper.init(driver, WAIT_TIME)
  

  // 

  for(let i = 0; i < DOMSettableTokenList.length; i++) {
    currentDeal = dealList[i]

    try {
      loginNamecheap()
    } catch (err) {

    }
  }
}

function loginNamecheap() {
  // Enter username & passward then submit
  await awaitAndSendKeys(By.css(`input[name="LoginUserName"]`), "user")
  await awaitAndSendKeys(By.css(`input[name="LoginPassword"]`), "password")
  await awaitAndClick(By.css(".head-loginb"))
}