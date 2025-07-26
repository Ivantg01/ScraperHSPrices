import * as log from "@std/log";
import { azureCloudProducts } from "../utils/db.ts";
import { fetchAzureCloudSkus, processAzureCloudSkus } from "./skus.ts";

/** Scrape Azure Cloud services by products */
export async function scrapeAzureCloudPrices() {
  const startDate = new Date();
  let counter = 0;
  // Scrape each selected Product for a set of services in all regions

  for (const product of azureCloudProducts) {
    if (!product.active) continue;
    try {
      const skus = await fetchAzureCloudSkus(product);
      await processAzureCloudSkus(skus);
      counter += skus.length;
    } catch (error) {
      log.error("Failed to fetch or save Azure cloud prices: " + error);
    }
  }
  log.info(`AzureCloud scraping ${counter} SKUs in ${new Date().getTime() - startDate.getTime()} ms`);
}
