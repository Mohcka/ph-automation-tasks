require("dotenv").config()

const fs = require("fs"),
  path = require("path"),
  colors = require("colors"),
  gapi = require("googleapis"),
  moment = require("moment"),
  { capCase, slugify } = require("../utils/text-utils"),
  { removeCityState } = require("../utils/helpers"),
  fetchedKeysAndDescs = require("./gsheets-fetch-keywords"),
  companies = require("../data/company_names.json").companyNames

// Data pulled from gSheets that will pair summaries with their keywords
let gsheetsKandDData = []

// Global data to have data input from the api and output to the template
let data = {}

//
let gcse = gapi.google.customsearch("v1")

async function runTemplateGen(dealsData = []) {
  gsheetsKandDData = await fetchedKeysAndDescs()

  for (let i = 0; i < dealsData.length; i++) {
    try {
      // Parsing keywords for template
      let keywords = dealsData[i].keywords
      let keyword = ""
      if (keywords != null) {
        if (keywords.split(/\r?\n/)[0].replace(/[\W\S\d]/g, "").length > 0) {
          // Remove numbers and symbols
          keyword = keywords.split(/\r?\n/)[0].replace(/[\W\S\d]/g, "")
        } else {
          keyword = keywords.split(/\r?\n/)[1]
        }
      }

      data.companyName =
        dealsData[i].company != null
          ? dealsData[i].company.name
          : "{COMPANY_NAME}"

      data.phone = dealsData[i].phone != null ? dealsData[i].phone : "{PHONE}"

      data.email =
        dealsData[i].bsnsEmail != null ? dealsData[i].bsnsEmail : "{EMAIL}"

      data.hours =
        dealsData[i].hours != null
          ? dealsData[i].hours.replace(/\r?\n/g, " ")
          : "{HOURS}"

      data.field =
        dealsData[i].primaryPhrase != null
          ? removeCityState(dealsData[i].primaryPhrase)
          : "{FIELD}"

      let location = null
      if (
        dealsData[i].serviceArea != null &&
        dealsData[i].gmbAddress.match(/([A-z]+),? [A-Z]{2}/) != null
      ) {
        location = dealsData[i].gmbAddress.match(/([A-z]+),? [A-Z]{2}/)[0]
      } else {
        location = "{LOCATION}"
      }

      data.location = location

      //* Descriptions
      data.web_desc1 = parseDesc(
        dealsData[i].webDesc,
        dealsData[i].facebookDesc
      )

      let web_desc2 =
        dealsData[i].webDesc != null
          ? dealsData[i].webDesc.split(/\r?\n/)[7]
            ? dealsData[i].webDesc.split(/\r?\n/)[7]
            : "{WEB DESCRIPTION 2}"
          : "{WEB DESCRIPTION 2}"
      data.web_desc2 = web_desc2.replace(/"/g, '\\"')

      data.keywords =
        keywords != null
          ? keywords.split(/\r?\n/).slice(1, 5)
          : Array.from({ length: 5 }, (v, k) => `{KEYWORD ${k + 1}}`)

      //* Images
      if (keyword.length > 0)
        data.images = await fetchGImages(removeCityState(keyword))
      // Once all the info has been input and parsed into data, enter the content into the template
      enterContent(data)

      //       const log = `------------------------
      // ${dealsData[i].name}
      // ---
      // ${dealsData[i].bsnsEmail /* email */}
      // ---
      // ${dealsData[i].phone /* phone */}
      // ---
      // ${data.location}
      // ---
      // ${data.web_desc1}
      // ---
      // ${data.web_desc2}
      // ------------------------`
      // console.log(log)
    } catch (err) {
      // console.log("ERR:")
      // console.log(err)

      writeError(err, { companyName: dealsData[i].companyName })
    }
  }
  console.log("Templates successfully generated ✓".green)
}

/**
 * Prases the description pulled from PLD, will use the standard description if it exists,
 * if it doesnt, will attempt to use the FB description. Failsafes to a default filler
 * @param {String} desc Standard website description
 * @param {String} fbDesc Facebook website description
 */
function parseDesc(desc, fbDesc) {
  let parsedDesc = ""

  if (desc != null) {
    // primary web desc is good and string is valid
    parsedDesc = desc.split(/\r?\n/)[0].replace(/\.[\w\s]+:/, ".")
  } else if (fbDesc != null) {
    // facbook desc
    parsedDesc = fbDesc
  } else {
    parsedDesc = "{WEB DESCRIPTION 1}"
  }

  return parsedDesc.replace(/"/g, '\\"')
}

async function fetchGImages(q) {
  // console.log(q)

  let res = await gcse.cse.list({
    cx: process.env.google_cse_cx_id_1,
    auth: process.env.google_api_key,
    q: q,
    searchType: "image",
    imgSize: "xlarge",
  })
  // console.log(res.data.items[1].link.replace(/\//g, "\\/"))

  return res.data.items.map(item =>
    item.link.replace(/\//g, "\\/").replace(/\?.*/g, "")
  )
}

function enterContent(data) {
  let content = fs.readFileSync(
    path.resolve("src", "data", "blank-template.json"),
    "utf8"
  )
  // Apply deal data to template
  content = content.replace(/\${company_name}/g, data.companyName)
  content = content.replace(/\${hours}/g, data.hours)
  content = content.replace(/\${phone}/g, data.phone)
  content = content.replace(/\${email}/g, data.email)
  content = content.replace(/\${field}/g, data.field)
  content = content.replace(/\${location}/g, data.location)
  content = content.replace(/\${web_desc_1}/g, data.web_desc1)
  content = content.replace(/\${web_desc_2}/g, data.web_desc2)

  // Apply images

  if (data.images) {
    content = content.replace(/\${featured_img}/g, data.images[1])
    content = content.replace(/\${featured_img_2}/g, data.images[2])
    content = content.replace(/\${slider_img_1}/g, data.images[3])
    content = content.replace(/\${slider_img_2}/g, data.images[4])
    content = content.replace(/\${slider_img_3}/g, data.images[5])
  } else {
    content = content.replace(
      /\${featured_img}/g,
      "https:\\/\\/images.arcadis.com\\/media\\/B\\/B\\/A\\/%7BBBA972D3-97ED-4C9F-9C4D-12E15AE3381D%7Dcontractor-1.jpg"
    )
    content = content.replace(
      /\${featured_img_2}/g,
      "https:\\/\\/accessiblehousingservices.com\\/wp-content\\/uploads\\/2015\\/09\\/Accessible-Remodel-Hire-Contractor.jpg"
    )
    content = content.replace(
      /\${slider_img_1}/g,
      "https:\\/\\/geniebelt.com\\/wp-content\\/uploads\\/27706-1024x795.jpg"
    )
    content = content.replace(
      /\${slider_img_2}/g,
      "https:\\/\\/allmasonry.com\\/wp-content\\/uploads\\/2015\\/02\\/construction-management.jpg"
    )
    content = content.replace(
      /\${slider_img_3}/g,
      "http:\\/\\/www.kiplinger.com\\/kipimages\\/pages\\/17487.jpg"
    )
  }

  // Parse keyword and description data
  const dummyDescData = [
    "Ready to upgrade your bathroom? Give us a call today!",
    "Let us help make your dream kitchen a reality in your home.",
    "Call us for other home remodeling services too!",
    "We can custom build your new home!",
  ]
  data.keywords.map((keyword, i) => {
    //loop through each keyword until match is found -> assign desc pair
    let matchedDesc = null
    for (let i = 0; i < gsheetsKandDData.length; i++) {
      if (
        keyword.trim().toLowerCase() ==
        gsheetsKandDData[i][0].trim().toLowerCase()
      ) {
        matchedDesc = gsheetsKandDData[i][1]
        break
      }
    }

    content = content.replace(`\${KEY${i + 1}}`, capCase(keyword))
    content = content.replace(
      `\${DESC${i + 1}}`,
      matchedDesc ? matchedDesc : dummyDescData[i]
    )
  })

  // Remove return lines and replace tabs with whitespace
  content = content.replace(/\r?\n/g, "")
  content = content.replace(/\t/g, " ")

  // fs.mkdirSync(`${__dirname}/templates/${slugify(data.companyName)}`, {
  //   recursive: true,
  // })
  fs.mkdirSync(path.resolve("templates", slugify(data.companyName)), {
    recursive: true,
  })

  // fs.writeFileSync(
  //   `templates/${slugify(data.companyName)}/template.json`,
  //   content.trim()
  // )
  fs.writeFileSync(
    path.resolve("templates", slugify(data.companyName), "template.json"),
    content.trim()
  )
}

function writeError(err, data) {
  fs.mkdirSync(path.resolve("logs"), {
    recursive: true,
  })
  let logFile = ""

  if (fs.existsSync(path.resolve("logs", "errors.log"))) {
    logFile = fs.readFileSync(path.resolve("logs", "errors.log"))
  }

  // console.log(logFile.toString())

  const errLog = `
======================================================
Log ${moment().format("MM/DD HH:mm:ss")}:
for: ${data.companyName}
${err}
======================================================
  `

  if (!fs.existsSync(path.resolve("logs", "errors.log"))) {
    fs.writeFileSync(path.resolve("logs", "errors.log"), errLog)
  } else {
    fs.writeFileSync(
      path.resolve("logs", "errors.log"),
      errLog + `\n ${logFile.toString()}`
    )
  }
}

module.exports = { runTemplateGen }
