require("dotenv").config()

const path = require("path")

const webdriver = require("selenium-webdriver")
const chrome = require("selenium-webdriver/chrome")
const chromePath = require("chromedriver").path

const prompts = require("prompts")
const colors = require("colors")

const { getData } = require("./src/fetch-pipeline-data")
const { runPreBuildout } = require("./src/automation-tasks/pre-buildout-task")
const { runWpPreconfig } = require("./src/automation-tasks/wp-config-task")

let driver = null
let choice = 0

// Initialize driver
const runAutomation = async () => {
  console.log(
    `  _    _      _ _        __          __        _     _ 
 | |  | |    | | |       \\ \\        / /       | |   | |
 | |__| | ___| | | ___    \\ \\  /\\  / /__  _ __| | __| |
 |  __  |/ _ \\ | |/ _ \\    \\ \\/  \\/ / _ \\| '__| |/ _\` |
 | |  | |  __/ | | (_) |    \\  /\\  / (_) | |  | | (_| |
 |_|  |_|\\___|_|_|\\___/      \\/  \\/ \\___/|_|  |_|\\__,_|`.rainbow
  )

  await intialPrompt()
  await createWebDriver()
  await run()
}

async function createWebDriver() {
  let service = await new chrome.ServiceBuilder(chromePath).build()
  chrome.setDefaultService(service)

  driver = await new webdriver.Builder()
    .withCapabilities(webdriver.Capabilities.chrome())
    .build()

  await driver
    .manage()
    .window()
    .setRect({ width: 1200, height: 880, x: 0, y: 0 })
}

// Start running automation tasks
const run = async () => {
  // Data pulled from pipeline
  let plData = null

  // 0. Get data
  plData = await getData()

  // Perform acton based on choice
  switch (choice) {
    case 1:
      await runPreBuildout(driver, plData)
      break
    case 2:
      await runWpPreconfig(driver, plData)
      break
    default:
      console.log(
        "You've made an invalid input.  Please restart the program and try again."
          .black.bgRed
      )
  }

  console.log("Done".green)
}

async function intialPrompt() {
  const choicesPromptText = `
Please select a buildout process.  All buildouts to run are received from the company_names.json file.  
If you already haven't done so, please enter the data into that file with the desired deals to proces buildouts for.
1. Website Purchase
2. Buildout
(Select a Number):`.cyan
  const choicePrompt = await prompts({
    type: "number",
    name: "choice",
    message: choicesPromptText,
  })

  choice = choicePrompt.choice
}

async function buildPrompts() {
  const buildoutPromptText = `
Please select a buildout process...
`

  const choicePrompt = await prompts({
    type: "number",
    name: "buldoutAction",
    message: buildoutPromptText,
  })

  choice = choicePrompt.buldoutAction
}

module.exports.runAutomation = runAutomation()
