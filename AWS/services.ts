import "@std/dotenv/load";
import * as log from "@std/log";
import { amazonCloudRegions, amazonCloudServices } from "../utils/db.ts";
import { fetchAmazonCloudSkus, processAmazonCloudSkus } from "./skus.ts";

/** Scrape Amazon Cloud services */
export async function scrapeAmazonCloudPrices() {
  const startDate = new Date();
  let counter = 0;
  // Scrape each service
  for (const service of amazonCloudServices) {
    if (!service.active) continue;
    if (service.scrapePerRegion == true) {
      // Scrape service region per region only selected regions (all regions data is > 4GB)
      for (const region of amazonCloudRegions) {
        if (!region.active) continue;
        try {
          log.info(`Scraping AmazonCloud service ${service.serviceId}/${region.name}`);
          const skusFilename = await fetchAmazonCloudSkus(service, region.name);
          counter += await processAmazonCloudSkus(skusFilename);
          if (Deno.env.get("STORE_FETCH_CONTENT") !== "True") {
            await Deno.remove(skusFilename); // Delete the file after processing
          }
        } catch (error) {
          log.error("Failed to fetch or save Amazon cloud prices: " + error);
        }
      }
    } else {
      // Scrape the service without specifying a region (all regions)
      try {
        log.info(`Scraping AmazonCloud service ${service.serviceId}`);
        const skusFilename = await fetchAmazonCloudSkus(service);
        counter += await processAmazonCloudSkus(skusFilename);
        if (Deno.env.get("STORE_FETCH_CONTENT") !== "True") {
          await Deno.remove(skusFilename); // Delete the file after processing
        }
      } catch (error) {
        log.error("Failed to fetch or save Amazon cloud prices: " + error);
      }
    }
  }
  log.info(`AmazonCloud scraping ${counter} SKUs in ${new Date().getTime() - startDate.getTime()} ms`);
}
