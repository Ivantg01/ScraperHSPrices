import "@std/dotenv/load";
import * as log from "@std/log";
import { format } from "@std/datetime";
import { GoogleCloudServiceApi } from "../types.ts";
import { googleCloudServices } from "../utils/db.ts";
import { saveJsonDataToFile } from "../utils/file.ts";
import { fetchGoogleCloudSkus, processGoogleCloudSkus } from "./skus.ts";
import { handleFetchWithRetry } from "../utils/fetch.ts";

interface ApiResponse {
  services: GoogleCloudServiceApi[];
  nextPageToken?: string;
}

/** scrape Google Cloud service names into a file */
export async function scrapeGoogleCloudServiceNames() {
  const apiKey = Deno.env.get("GCP_API_KEY");
  if (!apiKey) {
    log.error("API key not found in environment variables.");
    return;
  }
  // add the date to the filename
  const timestamp = format(new Date(), "yyyyMMddHHmmss");
  const outputFile = `GCP_services_${timestamp}.json`;

  try {
    const services = await fetchGoogleCloudServicesNames(apiKey);
    log.info(`Total services fetched: ${services.length}`);
    await saveJsonDataToFile(services, outputFile);
  } catch (error) {
    log.error("Failed to fetch or save services: " + error);
  }
}

/** get Google Cloud services names using Google APIs into an array */
async function fetchGoogleCloudServicesNames(apiKey: string): Promise<GoogleCloudServiceApi[]> {
  const baseurl = `https://cloudbilling.googleapis.com/v1/services/?key=${apiKey}`;
  let url = baseurl;
  let allServices: GoogleCloudServiceApi[] = [];
  let totalFetchCount = 0;

  while (url !== "") {
    try {
      const response = await handleFetchWithRetry(url);

      const data: ApiResponse = await response.json();
      const currentFetchCount = data.services?.length || 0;
      totalFetchCount += currentFetchCount;
      log.debug(`Fetched ${currentFetchCount} services in this request.`);

      allServices = allServices.concat(data.services || []);

      url = data.nextPageToken ? `${baseurl}&pageToken=${data.nextPageToken}` : "";
    } catch (error) {
      log.error("Error fetching services: " + error);
      break;
    }
  }

  log.info(`Total records fetched: ${totalFetchCount}`);
  return allServices;
}

/** Scrape Google Cloud services */
export async function scrapeGoogleCloudPrices() {
  const apiKey = Deno.env.get("GCP_API_KEY");
  if (!apiKey) {
    log.error("API key not found in environment variables.");
    return;
  }

  const startDate = new Date();
  let counter = 0;
  // Scrape each service
  for (const service of googleCloudServices) {
    if (!service.active) continue;
    try {
      log.info(`GoogleCloud scraping ${service.name} (${service.serviceId}) `);
      const skus = await fetchGoogleCloudSkus(service, apiKey);
      await processGoogleCloudSkus(skus);
      counter += skus.length;
    } catch (error) {
      log.error("Failed to fetch or save google cloud prices: " + error);
    }
  }
  log.info(`GoogleCloud scraping ${counter} SKUs in ${new Date().getTime() - startDate.getTime()} ms`);
}
