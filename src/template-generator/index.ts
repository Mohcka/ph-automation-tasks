import fs from "fs"
import path from "path"

import moment from "moment"

import { PipelineDataCollection, PipelineDataEntry } from "../DealDataFetcher"
import KeywordDataFetcher from "./KeywordDataFetcher"
import { google, customsearch_v1 } from "googleapis"

import TextUtils from "../utils/TextUtils"
import Helpers from "../utils/Helpers"

interface ParsedPipelineEntry extends PipelineDataEntry {
  email: string
  field: string
  location: string
  web_desc1: string
  web_desc2: string
  parsedKeywords: string[]
  images: string[]
}

export default class TemplateGenerator {
  private dealsData: PipelineDataCollection
  private parsedData: ParsedPipelineEntry
  private gsheetsKandDData: string[][]

  private failedTemplates: string[]

  private gsce: customsearch_v1.Customsearch

  constructor(plData: PipelineDataCollection) {
    this.dealsData = plData
    this.parsedData = {} as ParsedPipelineEntry
  }

  public async generateTemplates(): Promise<void> {
    this.gsce = google.customsearch("v1")
    // fetch keyword summarry from keywords and descriptions spreadsheets
    this.gsheetsKandDData = await KeywordDataFetcher.fetchKeysAndDescs()

    for (const deal of this.dealsData) {
      try {
        // Parsing keywords for template
        const keywords = deal.keywords
        let keyword = ""
        if (keywords != null) {
          if (keywords.split(/\r?\n/)[0].replace(/[\W\S\d]/g, "").length > 0) {
            // Remove numbers and symbols
            keyword = keywords.split(/\r?\n/)[0].replace(/[\W\S\d]/g, "")
          } else {
            keyword = keywords.split(/\r?\n/)[1]
          }
        }

        this.parsedData.companyName =
          deal.company != null ? deal.company.name : "{COMPANY_NAME}"

        this.parsedData.phone = deal.phone != null ? deal.phone : "{PHONE}"

        this.parsedData.email =
          deal.bsnsEmail != null ? deal.bsnsEmail : "{EMAIL}"

        this.parsedData.hours =
          deal.hours != null ? deal.hours.replace(/\r?\n/g, " ") : "{HOURS}"

        this.parsedData.field =
          deal.primaryPhrase != null
            ? Helpers.removeCityState(deal.primaryPhrase)
            : "{FIELD}"

        let location = null
        if (
          deal.serviceArea != null &&
          deal.gmbAddress.match(/([A-z]+),? [A-Z]{2}/) != null
        ) {
          location = deal.gmbAddress.match(/([A-z]+),? [A-Z]{2}/)![0]
        } else {
          location = "{LOCATION}"
        }

        this.parsedData.location = location

        // * Descriptions
        this.parsedData.web_desc1 = this.parseDesc(
          deal.webDesc,
          deal.facebookDesc
        )

        const webDesc2 =
          deal.webDesc != null
            ? deal.webDesc.split(/\r?\n/)[7]
              ? deal.webDesc.split(/\r?\n/)[7]
              : "{WEB DESCRIPTION 2}"
            : "{WEB DESCRIPTION 2}"
        this.parsedData.web_desc2 = webDesc2.replace(/"/g, '\\"')

        this.parsedData.parsedKeywords =
          keywords != null
            ? keywords.split(/\r?\n/).slice(1, 5)
            : Array.from({ length: 5 }, (v, k) => `{KEYWORD ${k + 1}}`)

        // * Images
        if (keyword.length > 0) {
          this.parsedData.images = await this.fetchGImages(
            Helpers.removeCityState(keyword)
          )
        }

        // Once all the info has been input and parsed into data, enter the content into the template
        this.enterContent(this.parsedData)
      } catch (err) {
        // console.log("ERR:")
        // console.log(err)

        this.writeError(err, { companyName: deal.companyName })
      }
    }
    // tslint:disable-next-line: no-console
    console.log("Templates successfully generated ✓".green)
  }

  /**
   * Prases the description pulled from PLD, will use the standard description if it exists,
   * if it doesnt, will attempt to use the FB description. Failsafes to a default filler
   * @param {String} desc Standard website description
   * @param {String} fbDesc Facebook website description
   */
  private parseDesc(desc: string, fbDesc: string): string {
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

  private async fetchGImages(query: string) {
    // console.log(q)

    const res: any = await this.gsce.cse.list({
      cx: process.env.google_cse_cx_id_1,
      auth: process.env.google_api_key,
      q: query,
      searchType: "image",
      imgSize: "xlarge",
    })

    const validItems = res.data.items.filter((item: any) =>
      item.link.match(/\.(jpe?g|png)/)
    )
    // console.log(validItems)

    return validItems.map((item: any) =>
      item.link.replace(/\//g, "\\/").replace(/\?.*/g, "")
    )
  }

  private enterContent(data: ParsedPipelineEntry): void {
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
    data.parsedKeywords.map((keyword: string, i: number) => {
      // loop through each keyword until match is found -> assign desc pair
      let matchedDesc = null
      for (const keywordPair of this.gsheetsKandDData[i]!) {
        if (
          keyword.trim().toLowerCase() === keywordPair[0].trim().toLowerCase()
        ) {
          matchedDesc = keywordPair[1]
          break
        }
      }

      content = content.replace(`\${KEY${i + 1}}`, TextUtils.capCase(keyword))
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
    fs.mkdirSync(
      path.resolve("templates", TextUtils.slugify(data.companyName)),
      {
        recursive: true,
      }
    )

    // fs.writeFileSync(
    //   `templates/${slugify(data.companyName)}/template.json`,
    //   content.trim()
    // )
    fs.writeFileSync(
      path.resolve(
        "templates",
        TextUtils.slugify(data.companyName),
        "template.json"
      ),
      content.trim()
    )
  }

  private writeError(err: any, companyName: object) {
    fs.mkdirSync(path.resolve("logs"), {
      recursive: true,
    })
    let logFile: Buffer | undefined

    if (fs.existsSync(path.resolve("logs", "errors.log"))) {
      logFile = fs.readFileSync(path.resolve("logs", "errors.log"))
    }

    // console.log(logFile.toString())

    const errLog = `
======================================================
Log ${moment().format("MM/DD HH:mm:ss")}:
for: ${companyName}
${err}
======================================================
`

    if (!fs.existsSync(path.resolve("logs", "errors.log"))) {
      fs.writeFileSync(path.resolve("logs", "errors.log"), errLog)
    } else {
      fs.writeFileSync(
        path.resolve("logs", "errors.log"),
        errLog + `\n ${logFile!.toString()}`
      )
    }
  }
}
