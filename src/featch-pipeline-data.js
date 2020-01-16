const axios = require("axios")

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
          company: res.data.entries[0].company,
          domain: res.data.entries[0].custom_fields.custom_label_1454434.toLowerCase(),
          bsnsEmail: res.data.entries[0].custom_fields.custom_label_1585966.toLowerCase(),
          phone: res.data.entries[0].custom_fields.custom_label_1585963,
          serviceArea: res.data.entries[0].custom_fields.custom_label_1585981,
          webDesc: res.data.entries[0].custom_fields.custom_label_3038791,
          hours: res.data.entries[0].custom_fields.custom_label_1454392,
          primaryPhrase: res.data.entries[0].custom_fields.custom_label_1807174,
          keywords: res.data.entries[0].custom_fields.custom_label_1454401,
          gmbAddress: res.data.entries[0].custom_fields.custom_label_1454398,
          facebookDesc: res.data.entries[0].custom_fields.custom_label_1486885,
        })
      })
  }

  return plData
}

module.exports = { getData }
