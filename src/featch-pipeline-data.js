const axios = require("axios")

const company_names = require("./data/company_names.json").company_names

// Domain url - custom_label_1454434

/**
 * Get data from the Pipeline Deals API based on company names
 */
async function getData() {
  let plData = []

  for (let i = 0; i < company_names.length; i++) {
    const company_name = company_names[i]

    await axios
      .get(
        `${process.env.PIPELINE_DEALS_API_URL}/deals.json?api_key=${process.env.PIPELINE_DEALS_API_KEY}&conditions[person_company_name]=${company_name}`
      )
      .then(res => {
        // console.log(res)
        plData.push({
          companyName: res.data.entries[0].company.name,
          domain: res.data.entries[0].custom_fields.custom_label_1454434.toLowerCase(),
        })
      })
  }

  return plData
}

module.exports = { getData }
