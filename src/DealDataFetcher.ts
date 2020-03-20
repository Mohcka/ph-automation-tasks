import axios from "axios"
import colors from "colors"
import ora, { Spinner, Ora } from "ora"

import NCApiManager, { INamecheapDomain } from "./nc-api-manager"

import { company_names } from "./data/company_names.json"
import fitlerList from "./data/pl_search_ids.json"

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
  private static ncApi: NCApiManager = new NCApiManager(
    process.env.NC_APIKEY as string,
    process.env.NC_USER as string,
    process.env.NC_IP as string
  )

  private static plData: PipelineDataCollection
  private searchID: number
  private static idList: string
  private static spinner: Ora

  /**
   *
   * @param searchID The pipelinedeals registered search ID used to fetch a list of deals from
   *                 a filtered list
   */
  public static async fetchData(searchParameters: {
    searchID?: number
    dealIDs?: string
  }): Promise<PipelineDataEntry[]> {
    this.plData = []
    // initialize Spinner
    this.spinner = ora("Stand By...")
    this.spinner.color = "cyan"
    this.spinner.text = "Fetching pipeline deals data"
    this.spinner.spinner = "dots6"
    this.spinner.start()

    const searchQuery = searchParameters.dealIDs
      ? `conditions[deal_id]=${searchParameters.dealIDs}`
      : `search_id=${searchParameters.searchID}`

    await axios
      .get(
        `${process.env.PIPELINE_DEALS_API_URL}/deals.json?api_key=${process.env.PIPELINE_DEALS_API_KEY}&search_id=${searchParameters.searchID}`
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

    

    return this.plData
  }

  /**
   * Filter deals to the ones that are registered under namecheap
   */
  public static async getFilteredDeals(
    plData: PipelineDataCollection
  ): Promise<PipelineDataEntry[]> {
    const filteredDeals: PipelineDataEntry[] = []
    const domains: INamecheapDomain[] = await this.ncApi.getAllDomains()

    for (const deal of plData) {
      // The NC Domain that matched the domain in the PL data entry
      const foundMatch = domains.find(domain => {
        // If the deals domain matches the domain from NC
        // it's valid and is ok to be processeds
        return domain.Name === deal.domain
      })
      // Push deal to stack if it's domain is registered
      if (foundMatch) filteredDeals.push(deal)
      // console.log(deal.domain)
      // console.log(foundMatch)
    }

    console.log(filteredDeals.length)
    return filteredDeals
  }

  /**
   * Fetches all deals from Pipeline that have domains registered with the provided
   * Namecheap user.
   */
  public static async getDealsWithRegisteredDomains(): Promise<
    PipelineDataEntry[]
  > {
    const deals = await this.fetchData({ searchID: fitlerList.websitePurchase })
    const filteredDeals = await this.getFilteredDeals(deals)

    this.spinner.text = `Found ${ filteredDeals.length} deals with registered domains`.green
    this.spinner.succeed()

    return await filteredDeals
  }

  /**
   * Searches for and returns a list of deals from the buildout list
   * where all the desired data is found within the custom fields (currently we're looking for
   * just the Web description field not to be empty)
   */
  public static async getCompleteDeals(): Promise<PipelineDataEntry[]> {
    const deals = await this.fetchData({ searchID: fitlerList.buildout })

    const completeDeals = deals.filter(deal => {
      return deal.webDesc !== null
    })

    this.spinner.text = `Found ${completeDeals.length} deals with valid Data`.green
    this.spinner.succeed()

    return completeDeals
  }

  /**
   * Returns a comma seperrated string of the unique ids of pipeline deals
   * to fetch, using data found from the company_names.json
   */
  public static getDealIDsList(): string {
    return company_names
      .map(listItem => listItem.match(/- (\d+)/)![1])
      .join(",")
  }
}
