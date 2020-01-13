require("dotenv").config()

// import path = require("path")
// import path from "path"

import * as webdriver from "selenium-webdriver"
import * as chrome from "selenium-webdriver/chrome"

import { path as chromePath } from "chromedriver"

import { getData } from "./featch-pipeline-data.js"
import { runPreBuildout } from "./pre-buildout-task.js"


let driver = null

// Initialize driver
const runAutomation = async () => {
  const service = await new chrome.ServiceBuilder(chromePath).build()
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
