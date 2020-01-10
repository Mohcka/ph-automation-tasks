require("dotenv").config()

const path = require("path")

const webdriver = require("selenium-webdriver")
const { Builder } = webdriver
const firefox = require("selenium-webdriver/firefox")
const chrome = require("selenium-webdriver/chrome")
const geckoPath = require("geckodriver").path
const chromePath = require("chromedriver").path

const { getData } = require("./src/featch-pipeline-data")
const { runPreBuildout } = require("./src/pre-buildout-task")

let driver = null

// Initialize driver
const runAutomation = async () => {
  let service = await new chrome.ServiceBuilder(chromePath).build()
  chrome.setDefaultService(service)

  driver = await new webdriver.Builder()
    .withCapabilities(webdriver.Capabilities.chrome())
    .build()

  await run()
}

// Start running automation tasks
const run = async () => {
  // Data pulled from pipeline
  let plData = null

  // 0. Get data
  plData = await getData()
  console.log(plData)
  // 1. Prebuildout
  await runPreBuildout(driver, plData)
}

module.exports.runAutomation = runAutomation()
