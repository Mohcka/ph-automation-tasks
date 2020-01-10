require("dotenv").config()

const path = require("path")

const webdriver = require("selenium-webdriver")
const { Builder } = webdriver
const firefox = require("selenium-webdriver/firefox")
const chrome = require("selenium-webdriver/chrome")
const geckoPath = require("geckodriver").path
const chromePath = require("chromedriver").path

const runPreBuildOut = require("./src/pre-buildout-task").runBuildout

let driver = null;

// Initialize driver
const runAutomation = async () => {

  let service = await new chrome.ServiceBuilder(chromePath).build()
  chrome.setDefaultService(service)

  driver = await new webdriver.Builder()
    .withCapabilities(webdriver.Capabilities.chrome())
    .build()

    run();
}

// Start running automation tasks
const run = () => {
  // 1. Prebuildout
  runPreBuildOut(driver);
}

module.exports.runAutomation = runAutomation()
