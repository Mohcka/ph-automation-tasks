//* PIPELINE
// Get business names from the pipelinedeals deals UI
[...document.querySelectorAll(`td[data-column="deal_company_name"] a`)]
  .map(company_link => company_link.innerText)
  .join("\n");