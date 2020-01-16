const path = require("path")

const {  By, Key, until } = require("selenium-webdriver")


const selHelper = require("../selenium-helpers")
const taskHelper = require("../task-helpers")
const { awaitAndClick, awaitAndSendKeys } = require("../selenium-helpers")

const colors = require("colors")

let driver = null
let WAIT_TIME = null
let currentDeal = null

// let tabs = null

let pageName = "Home"

let failLogs = []

/**
 * Main function to run the prebuildout tasks
 * @param {Builder} pulleDriver -
 * @param {Array}   domainList  - list of domains to create throuh plesk
 */
const runCreatePreview = async (pullledDriver, domainList) {
  
}