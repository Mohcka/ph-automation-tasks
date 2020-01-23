const axios = require("axios")
const colors = require("colors")

const company_names = require("./data/company_names.json").company_names

//* Domain url - custom_label_1454434
//* bsns email custom_label_1585966
//* phone custom_label_1585963
//* service area custom_label_1585981
//* web_desc custom_label_3038791
//* hours custom_label_1454392
//* primary phrase custom_label_1807174
//* keywords custom_label_1454401
//* gmb address custom_label_1454398
//* facebook desc custom_label_1486885
//* website completed date custom_label_2625754

/**
 * Get data from the Pipeline Deals API based on company names
 */
async function getData() {
  let plData = []
  let idList = company_names
    .map(listItem => listItem.match(/- (\d+)/)[1])
    .join(",")

  // console.log(idList)

  await axios
    .get(
      `${process.env.PIPELINE_DEALS_API_URL}/deals.json?api_key=${process.env.PIPELINE_DEALS_API_KEY}&conditions[deal_id]=${idList}`
    )
    .then(res => {
      // console.log(res.data.entries.length)
      let entries = res.data.entries
      for (let i = 0; i < entries.length; i++) {
        // console.log(res.data.entries)
        let domain = entries[i].custom_fields.custom_label_1454434
          ? entries[i].custom_fields.custom_label_1454434.toLowerCase()
          : entries[i].custom_fields.custom_label_1454434
        let bsnEmail = entries[i].custom_fields.custom_label_1585966
          ? entries[i].custom_fields.custom_label_1585966.toLowerCase()
          : entries[i].custom_fields.custom_label_1585966

        plData.push({
          id: entries[i].id,
          companyName: entries[i].company.name,
          company: entries[i].company,
          domain: domain,
          bsnsEmail: bsnEmail,
          phone: entries[i].custom_fields.custom_label_1585963,
          serviceArea: entries[i].custom_fields.custom_label_1585981,
          webDesc: entries[i].custom_fields.custom_label_3038791,
          hours: entries[i].custom_fields.custom_label_1454392,
          primaryPhrase: entries[i].custom_fields.custom_label_1807174,
          keywords: entries[i].custom_fields.custom_label_1454401,
          gmbAddress: entries[i].custom_fields.custom_label_1454398,
          facebookDesc: entries[i].custom_fields.custom_label_1486885,
        })
      }
    })

  console.log("PipelinDeals data has been fetched ✓".green)

  return plData
}

module.exports = { getData }
