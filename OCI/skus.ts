import "@std/dotenv/load";
import * as log from "@std/log";
import * as path from "jsr:@std/path";
import { OracleCloudSkuApi, OracleCloudSkuFlat } from "../types.ts";
import OracleCloudPriceModel from "../models/OracleCloudPrice.ts";
import { saveTextDataToFile } from "../utils/file.ts";
import { handleFetchWithRetry } from "../utils/fetch.ts";

interface ApiResponse {
  items: OracleCloudSkuApi[];
}

/** function to fetch SKUs of all Oracle Cloud services into an array */
async function fetchOracleCloudSkus(): Promise<OracleCloudSkuApi[]> {
  const baseurl = Deno.env.get("WEBSIMULATOR_ENABLE") === "True"
    ? `http://${Deno.env.get("WEBSIMULATOR_HOST")}:${Deno.env.get("WEBSIMULATOR_PORT")}`
    : "https://apexapps.oracle.com";
  const pathUrl = `/pls/apex/cetools/api/v1/products?currencyCode=USD`;
  const url = baseurl + pathUrl;
  let allSkus: OracleCloudSkuApi[] = [];

  log.debug(`-Fetching OracleCloud SKUs ${url}`);
  try {
    const response = await handleFetchWithRetry(url);

    const text = await response.text();
    const data: ApiResponse = JSON.parse(text);
    const currentFetchCount = data.items.length || 0;
    log.debug(`-Fetched ${currentFetchCount} OracleCloud skus in this request.`);
    if (Deno.env.get("STORE_FETCH_CONTENT") === "True") {
      const filename = path.join(Deno.cwd(), "tests", "download", "OCI", "products.json");
      await saveTextDataToFile(text, filename);
    }

    allSkus = allSkus.concat(data.items);
  } catch (error) {
    log.error(`Error fetching all OracleCloud SKUs: ${error}`);
  }

  log.debug(`OracleCloud all SKUs fetched: ${allSkus.length}`);
  return allSkus;
}

/** Process fetched Oracle Cloud SKUs into a flat array to be saved in a database */
async function processOracleCloudSkus(skus: OracleCloudSkuApi[]) {
  const skusFlat: OracleCloudSkuFlat[] = skus.map((sku) => {
    //get the second price if exists, as the first one is free
    const index = (sku.currencyCodeLocalizations[0].prices.length > 1) ? 1 : 0;
    return {
      partNumber: sku.partNumber,
      displayName: sku.displayName,
      metricName: sku.metricName,
      serviceCategory: sku.serviceCategory,
      currencyCode: sku.currencyCodeLocalizations[0].currencyCode,
      model: sku.currencyCodeLocalizations[0].prices[index].model,
      value: sku.currencyCodeLocalizations[0].prices[index].value,
      rangeMin: sku.currencyCodeLocalizations[0].prices[index].rangeMin || undefined,
      rangeMax: sku.currencyCodeLocalizations[0].prices[index].rangeMax || undefined,
    };
  });

  //bulkOps to update GoogleCloudPrice from OracleCloudTempPrice
  await updateOracleCloudSkus(skusFlat);
}

/** Add new and update existing skus to database */
async function updateOracleCloudSkus(skus: OracleCloudSkuFlat[]) {
  try {
    const bulkOps = skus.map((sku) => ({
      updateOne: {
        filter: { partNumber: sku.partNumber },
        update: { $set: sku },
        upsert: true,
      },
    }));
    const resultBulk = await OracleCloudPriceModel.bulkWrite(bulkOps);
    log.debug(`--SKUs processed: ${resultBulk.modifiedCount} updated / ${resultBulk.upsertedCount} added`);
  } catch (error) {
    log.error("Error updating Oracle Cloud prices: " + error);
    throw error;
  }
}

export { fetchOracleCloudSkus, processOracleCloudSkus };
