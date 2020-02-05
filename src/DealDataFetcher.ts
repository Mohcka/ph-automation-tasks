import axios from "axios"
import colors from "colors"
import ora, { Spinner, Ora } from "ora"

import { company_names } from "./data/company_names.json"

interface ICustomFields {
  /**
   * Domain name
   */
  custom_label_1454434: string
}

interface Entry {
  /**
   * Id for the pipeline deal
   */
  id: number
  custom_fields: { [key: string]: string }
  company: { name: string }
}

/**
 * Array of pipeline data entries
 */
interface PLEntries extends Array<Entry> {}

/**
 * Retried entry from the pipeline deals api
 */
export interface PipelineDataEntry {
  id: number
  companyName: string
  company: { name: string }
  domain: string
  bsnsEmail: string
  phone: string
  serviceArea: string
  webDesc: string
  hours: string
  primaryPhrase: string
  keywords: string
  gmbAddress: string
  facebookDesc: string
}

/**
 * Colleaction of data deal entries from the pipeline deals api
 */
export interface PipelineDataCollection extends Array<PipelineDataEntry> {}

/**
 * A simple interface to fetch a filtered collection of entries for each of the specified deals
 * from the pipeline deals api
 */
export default class DealDataFetcher {
  private static plData: PipelineDataCollection
  private searchID: number
  private static idList: string
  private static spinner: Ora


  public static async fetchData(): Promise<PipelineDataCollection> {
    this.plData = []
    // Parse ids
    this.idList = company_names
      .map(listItem => listItem.match(/- (\d+)/)![1])
      .join(",")
    // initialize Spinner
    this.spinner = ora("Stand By...")
    this.spinner.color = "cyan"
    this.spinner.text = "Fetching pipeline deals data"
    this.spinner.spinner = "dots6"
    this.spinner.start()

    await axios
      .get(
        `${process.env.PIPELINE_DEALS_API_URL}/deals.json?api_key=${process.env.PIPELINE_DEALS_API_KEY}&conditions[deal_id]=${this.idList}`
      )
      .then(res => {
        // console.log(res.data.entries.length) //* for debugging
        const entries: PLEntries = res.data.entries

        for (const entry of entries) {
          // console.log(res.data.entries) //* for debugging
          const parsedDomain = entry.custom_fields.custom_label_1454434
            ? entry.custom_fields.custom_label_1454434.toLowerCase()
            : entry.custom_fields.custom_label_1454434
          const parsedBsnsEmail = entry.custom_fields.custom_label_1585966
            ? entry.custom_fields.custom_label_1585966.toLowerCase()
            : entry.custom_fields.custom_label_1585966

          this.plData.push({
            id: entry.id,
            companyName: entry.company.name,
            company: entry.company,
            domain: parsedDomain,
            bsnsEmail: parsedBsnsEmail,
            phone: entry.custom_fields.custom_label_1585963,
            serviceArea: entry.custom_fields.custom_label_1585981,
            webDesc: entry.custom_fields.custom_label_3038791,
            hours: entry.custom_fields.custom_label_1454392,
            primaryPhrase: entry.custom_fields.custom_label_1807174,
            keywords: entry.custom_fields.custom_label_1454401,
            gmbAddress: entry.custom_fields.custom_label_1454398,
            facebookDesc: entry.custom_fields.custom_label_1486885,
          })
        }
      })

    this.spinner.text = "Deals data has been fetched".green
    this.spinner.succeed()

    return this.plData
  }

  public setSearchID(searchID: number): void {
    this.searchID = searchID
  }
}
