import * as log from "@std/log";
import { fetchOracleCloudSkus, processOracleCloudSkus } from "./skus.ts";

/** Scrape Oracle Cloud services */
export async function scrapeOracleCloudPrices() {
  const startDate = new Date();
  let counter = 0;

  try {
    const skus = await fetchOracleCloudSkus();
    await processOracleCloudSkus(skus);
    counter += skus.length;
  } catch (error) {
    log.error("Failed to fetch or save oracle cloud prices: " + error);
  }

  log.info(`OracleCloud scraping ${counter} SKUs in ${new Date().getTime() - startDate.getTime()} ms`);
}
