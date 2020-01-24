//* PIPELINE
// Get business names from the pipelinedeals deals UI
[...document.querySelectorAll(`td[data-column="deal_company_name"] a`)]
  .map(company_link => company_link.innerText)
  .join("\n");

[...document.querySelectorAll("tr[data-cypress]")]
.map(item => `${item.querySelector("td[data-column='deal_company_name'] a").innerText} - ${item.getAttribute("data-id")}`)
.join("\n")

//* Utilities
// Standard xpath script
document.evaluate(`//*`, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue
// Xpath script when searching for specific text
document.evaluate(`//*[contains(text(), "Text")]`, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue