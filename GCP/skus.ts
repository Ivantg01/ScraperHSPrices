import "@std/dotenv/load";
import * as log from "@std/log";
import * as path from "jsr:@std/path";
import {GoogleCloudServiceApi, GoogleCloudSkuApi, GoogleCloudSkuFlat} from "../types.ts";
import GoogleCloudPriceModel from "../models/GoogleCloudPrice.ts";
import {saveTextDataToFile} from "../utils/file.ts";
import {handleFetchWithRetry} from "../utils/fetch.ts";

interface ApiResponse {
  skus: GoogleCloudSkuApi[];
  nextPageToken?: string;
}

/** function to fetch SKUs of selected Google Cloud service into an array */
async function fetchGoogleCloudSkus(
  service: GoogleCloudServiceApi,
  apiKey: string,
): Promise<GoogleCloudSkuApi[]> {
  const baseUrl = Deno.env.get("WEBSIMULATOR_ENABLE") === "True"
    ? `http://${Deno.env.get("WEBSIMULATOR_HOST")}:${Deno.env.get("WEBSIMULATOR_PORT")}`
    : "https://cloudbilling.googleapis.com";
  const pathUrl = `/v1/services/${service.serviceId}/skus?key=${apiKey}`;
  let url = baseUrl + pathUrl;
  let allSkus: GoogleCloudSkuApi[] = [];
  let totalFetchCount = 0;

  let i = 0;
  while (url !== "") {
    log.debug(`-Fetching GoogleCloud SKUs ${url}`);
    try {
      const response = await handleFetchWithRetry(url);

      const text = await response.text();
      const data: ApiResponse = JSON.parse(text);
      const currentFetchCount = data.skus?.length || 0;
      totalFetchCount += currentFetchCount;
      log.debug(`-Fetched ${currentFetchCount} GoogleCloud skus in this request.`);
      if (Deno.env.get("STORE_FETCH_CONTENT") === "True") {
        const filename = path.join(Deno.cwd(), "tests", "download", "GCP", `${service.serviceId}_skus${i++}.json`);
        await saveTextDataToFile(text, filename);
      }

      allSkus = allSkus.concat(data.skus);
      url = data.nextPageToken ? `${baseUrl}${pathUrl}&pageToken=${data.nextPageToken}` : "";
    } catch (error) {
      log.error(`Error fetching GoogleCloud SKUs of ${service.name}: ${error}`);
      break;
    }
  }

  log.debug(`GoogleCloud SKUs fetched of ${service.name}: ${allSkus.length}`);
  return allSkus;
}

/** Process fetched Google Cloud SKUs into a flat array to be saved in a database */
async function processGoogleCloudSkus(skus: GoogleCloudSkuApi[]) {
  const skusFlat: GoogleCloudSkuFlat[] = skus
    .flatMap((sku) =>
      sku.serviceRegions.map((region) => {
        const regex = /services\/(.*)\/skus/;
        const match = sku.name.match(regex);
        const serviceId = match ? match[1] : "";
        let usageUnit = "";
        let displayQuantity = 0;
        let startUsageAmount = 0;
        let currencyCode = "";
        let priceUnits = "0";
        let priceNanos = 0;
        let usageUnitDescription = "";
        let baseUnit = "";
        let baseUnitDescription = "";
        let baseUnitConversionFactor = 0;
        //if several pricingInfo, keep the last one (typically first one is free)
        if (sku.pricingInfo.length > 0) {
          if (sku.pricingInfo.length > 1) {
            log.warn(`"***** GoogleCloud Sku: ${sku.skuId} has ${sku.pricingInfo.length} pricingInfo *****`);
          }
          usageUnit = sku.pricingInfo[sku.pricingInfo.length - 1].pricingExpression.usageUnit;
          displayQuantity = sku.pricingInfo[sku.pricingInfo.length - 1].pricingExpression.displayQuantity;
          if (sku.pricingInfo[sku.pricingInfo.length - 1].pricingExpression.tieredRates.length > 0) {
            //if (sku.pricingInfo[sku.pricingInfo.length - 1].pricingExpression.tieredRates.length > 1) {
            //  log.warn(`"***** Sku: ${sku.skuId} has several tieredRates *****`);
            //}
            startUsageAmount =
              sku.pricingInfo[sku.pricingInfo.length - 1].pricingExpression.tieredRates[sku.pricingInfo.length - 1]
                .startUsageAmount;
            //if several tiered rates, keep the last one (most updated)
            currencyCode =
              sku.pricingInfo[sku.pricingInfo.length - 1].pricingExpression.tieredRates[sku.pricingInfo.length - 1]
                .unitPrice.currencyCode;
            priceUnits =
              sku.pricingInfo[sku.pricingInfo.length - 1].pricingExpression.tieredRates[sku.pricingInfo.length - 1]
                .unitPrice.units;
            priceNanos =
              sku.pricingInfo[sku.pricingInfo.length - 1].pricingExpression.tieredRates[sku.pricingInfo.length - 1]
                .unitPrice.nanos;
            usageUnitDescription = sku.pricingInfo[sku.pricingInfo.length - 1].pricingExpression.usageUnitDescription;
            baseUnit = sku.pricingInfo[sku.pricingInfo.length - 1].pricingExpression.baseUnit;
            baseUnitDescription = sku.pricingInfo[sku.pricingInfo.length - 1].pricingExpression.baseUnitDescription;
            baseUnitConversionFactor =
              sku.pricingInfo[sku.pricingInfo.length - 1].pricingExpression.baseUnitConversionFactor;
          }
        }

        return {
          searchCode: "",
          serviceId: serviceId,
          skuId: sku.skuId + "/" + region, //add region to skuId to make it unique
          description: sku.description,
          serviceDisplayName: sku.category.serviceDisplayName,
          resourceFamily: sku.category.resourceFamily,
          resourceGroup: sku.category.resourceGroup,
          usageType: sku.category.usageType,
          serviceRegion: region,
          usageUnit: usageUnit,
          displayQuantity: displayQuantity,
          startUsageAmount: startUsageAmount,
          currencyCode: currencyCode,
          price: Number(priceUnits) + Number(priceNanos) / 1000000000,
          usageUnitDescription: usageUnitDescription,
          baseUnit: baseUnit,
          baseUnitDescription: baseUnitDescription,
          baseUnitConversionFactor: baseUnitConversionFactor,
          geoTaxonomyType: sku.geoTaxonomy?.type || "TYPE_UNSPECIFIED",
        };
      }).filter(isValidGoogleCloudSku)
        .map((sku) => ({
          ...sku,
          searchCode: calculateSearchCode(sku),
        }))
    );

  //bulkOps to update GoogleCloudPrice from GoogleCloudTempPrice
  await updateGoogleCloudSkus(skusFlat);
}

/** Filter SKUs fetched from Google Cloud that are not interesting */
function isValidGoogleCloudSku(sku: GoogleCloudSkuFlat): boolean {
  function isValidComputeEngineType(sku: GoogleCloudSkuFlat): boolean {
    //select the most interesting VMs SKUs (Reserved is for Reserved RAM)
    if (
      sku.resourceFamily === "Compute" && (!sku.description.includes("Cpu in") &&
        !sku.description.includes("Ram in") && !sku.description.includes("Instance Ram running in") &&
        !sku.description.includes("Instance Core running in") ||
        sku.description.includes("Sole Tenancy") || sku.description.startsWith("Spot") ||
        sku.description.startsWith("Memory Optimized") || sku.description.startsWith("Committed Use") ||
        sku.description.startsWith("Reserved"))
    ) {
      return false;
    } else if (sku.resourceFamily === "Network" && sku.resourceGroup !== "PremiumInternetEgress") {
      return false;
    } else if (
      sku.resourceFamily === "Storage" &&
      ((sku.resourceGroup !== "LocalSSD" && sku.resourceGroup !== "MachineImage" &&
          sku.resourceGroup !== "PDStandard" && sku.resourceGroup !== "SSD") ||
        (sku.resourceGroup === "LocalSSD" && sku.description.includes("Preemptible")) ||
        (sku.resourceGroup === "SSD" &&
          (sku.description.includes("Hyperdisk") || sku.description.includes("Asynchronous"))))
    ) {
      return false;
    } else if (sku.resourceFamily === "License") {
      return false;
    }
    return true;
  }

  function isValidCCloudStorageType(sku: GoogleCloudSkuFlat): boolean {
    //select the most interesting CloudStorage: std, nearline, archive
    if (
      sku.resourceGroup !== "RegionalStorage" && sku.resourceGroup !== "NearlineStorage" &&
      sku.resourceGroup !== "ArchiveStorage"
    ) {
      return false;
    } else if (sku.usageUnit !== "GiBy.mo" || sku.description.endsWith("-region")) {
      return false;
    }
    return true;
  }

  function isValidCloudSqlType(sku: GoogleCloudSkuFlat): boolean {
    //select the most interesting CloudSQL: postgres
    if (
      sku.resourceGroup !== "SSD" && sku.resourceGroup !== "PDStandard" && sku.resourceGroup !== "PDSnapshot" &&
      sku.resourceGroup !== "SQLGen2InstancesCPU" && sku.resourceGroup !== "SQLGen2InstancesRAM"
    ) {
      return false;
    } else if (
      !sku.description.startsWith("Cloud SQL for PostgreSQL: Zonal - Low cost ") &&
      !sku.description.startsWith("Cloud SQL for PostgreSQL: Zonal - Standard ") &&
      !sku.description.startsWith("Cloud SQL for PostgreSQL: Zonal - vCPU") &&
      !sku.description.startsWith("Cloud SQL for PostgreSQL: Zonal - RAM") &&
      !sku.description.startsWith("Cloud SQL for PostgreSQL: Regional - Low cost") &&
      !sku.description.startsWith("Cloud SQL for PostgreSQL: Regional - Standard") &&
      !sku.description.startsWith("Cloud SQL for PostgreSQL: Regional - vCPU") &&
      !sku.description.startsWith("Cloud SQL for PostgreSQL: Regional - RAM") &&
      !sku.description.startsWith("Cloud SQL: Backups")
    ) {
      return false;
    }
    return true;
  }

  function isValidGkeType(sku: GoogleCloudSkuFlat): boolean {
    //select the most interestingGKE: k8 clusters
    return (sku.description === "Regional Kubernetes Clusters" || sku.description === "Zonal Kubernetes Clusters");
  }

  if (sku.serviceId === "6F81-5844-456A" && !isValidComputeEngineType(sku)) {
    return false;
  } else if (sku.serviceId === "95FF-2EF5-5EA1" && !isValidCCloudStorageType(sku)) {
    return false;
  } else if (sku.serviceId === "9662-B51E-5089" && !isValidCloudSqlType(sku)) {
    return false;
  } else if (sku.serviceId === "CCD8-9BF1-090E" && !isValidGkeType(sku)) {
    return false;
  }

  return true;
}

/** Calculate a search code for a SKU to search SKUs quickly */
function calculateSearchCode(sku: GoogleCloudSkuFlat): string {
  //Code= region/service/resourceFamily/resourceGroup/usageType/geoTaxonomy/virtualMachineType
  //
  //Compute Engine:
  //->    region/ce    /cmp           /[cpu|ram]    /[1y|3y|od]/          /[M1M2|N1|C2|...]
  //->    region/ce    /net           /egress       /od        /city
  //->    region/ce    /str           /[ssd|...]    /[1y|3y|od]/
  //Cloud Storage:
  //->    region/cs    /str           /[archive|...]/
  //Cloud SQL:
  //->    region/sql   /app           /[ssd|cpu|...]/          /[regional|zonal]
  //Kubernetes Engine:
  //->    region/gke   /k8            /             /          /[regional|zonal]
  const codeMap = {
    //VM & Storage
    "1y": "Commit1Yr",
    "3y": "Commit3Yr",
    "od": "OnDemand",
  };

  function getCodeByDesc(desc: string | undefined): string | undefined {
    return Object.keys(codeMap).find((code) => desc?.endsWith(codeMap[code as keyof typeof codeMap]));
  }

  function calculateSearchCodeComputeEngine(sku: GoogleCloudSkuFlat): string {
    //3 types c=compute, n=network, s=storage
    if (sku.resourceFamily === "Compute") {
      if (sku.description.includes("Commitment")) {
        const a_index = sku.description.indexOf("Cpu in");
        const b_index = sku.description.indexOf("Ram in");
        if (a_index > 0 || b_index > 0) {
          let code = (sku.description.split(" ")[1] !== "v1:")
            ? sku.description.split(" ")[1]
            : sku.description.split(" ")[2];
          if (code === "Compute") {
            code = "C2";
          } else if (code === "Cpu" || code === "Ram") {
            code = "N1";
          } else if (code === "Memory-optimized") {
            code = "M1-M2";
          }
          return "cmp/" + (a_index > 0 ? "cpu/" : "ram/") + getCodeByDesc(sku.usageType) + "//" + code;
        }
      } else if (
        sku.description.includes("Instance Ram running in") ||
        sku.description.includes("Instance Core running in")
      ) {
        let code = sku.description.split(" ")[0];
        if (code === "Compute") {
          code = "C2";
        } else if (code === "Cpu" || code === "Ram" || code === "Custom") {
          code = "N1";
        } else if (code === "Memory-optimized") {
          code = "M1-M2";
        }
        if (sku.description.includes("Custom Extended")) {
          code += "-CustomExtended";
        } else if (sku.description.includes("Custom")) {
          code += "-Custom";
        }
        return "cmp/" + (sku.description.includes("Instance Core running") ? "cpu/" : "ram/") +
          getCodeByDesc(sku.usageType) + "//" + code;
      }
    } else if (sku.resourceFamily === "Network" && sku.resourceGroup === "PremiumInternetEgress") {
      const city = sku.description.split(" to ")[1];
      return "net/egress/" + getCodeByDesc(sku.usageType) + "/" + city;
    } else if (sku.resourceFamily === "Storage") {
      let code = "";
      if (sku.description.includes("Regional Balanced PD Capacity")) {
        code = "pd-balanced-regional";
      } else if (sku.description.includes("Balanced PD Capacity")) {
        code = "pd-balanced";
      } else if (sku.description.includes("Regional SSD backed PD Capacity")) {
        code = "pd-ssd-regional";
      } else if (sku.description.includes("SSD backed PD Capacity")) {
        code = "pd-ssd";
      } else if (sku.description.includes("Regional Storage PD Capacity")) {
        code = "pd-standard-regional";
      } else if (sku.description.includes("Storage PD Capacity")) {
        code = "pd-standard";
      } else if (sku.description.includes("Extreme PD Capacity")) {
        code = "pd-extreme";
      } else if (sku.description.includes("Extreme PD IOPS")) {
        code = "pd-extreme-iops";
      } else if (sku.description.includes("Commitment v1: Local SSD")) {
        code = "local-ssd/" + getCodeByDesc(sku.usageType);
      } else if (sku.description.includes("SSD backed Local Storage")) {
        code = "ssd-backed-local";
      } else if (sku.description.includes("Storage Machine Image")) {
        code = "image";
      }
      return "str/" + code + "/" + getCodeByDesc(sku.usageType);
    }
    return "";
  }

  function calculateSearchCodeCloudStorage(sku: GoogleCloudSkuFlat): string {
    let code = "";
    if (sku.resourceGroup === "RegionalStorage") {
      code = "standard";
    } else if (sku.resourceGroup === "NearlineStorage") {
      code = "nearline";
    } else if (sku.resourceGroup === "ArchiveStorage") {
      code = "archive";
    }
    return "str/" + code;
  }

  function calculateSearchCloudSql(sku: GoogleCloudSkuFlat): string {
    const regionType = (sku.description.includes("Regional")) ? "regional" : "zonal";
    let code = "";
    if (sku.resourceGroup === "SSD") {
      code = "ssd";
    } else if (sku.resourceGroup === "PDStandard") {
      code = "standard";
    } else if (sku.resourceGroup === "PDSnapshot") {
      code = "backup";
    } else if (sku.resourceGroup === "SQLGen2InstancesCPU") {
      code = "cpu";
    } else if (sku.resourceGroup === "SQLGen2InstancesRAM") {
      code = "ram";
    }
    return "app/" + code + "//" + regionType;
  }

  if (sku.serviceId === "6F81-5844-456A") { //Compute Engine
    return `${sku.serviceRegion}/ce/` + calculateSearchCodeComputeEngine(sku);
  } else if (sku.serviceId === "95FF-2EF5-5EA1") { //Cloud Storage
    return `${sku.serviceRegion}/cs/` + calculateSearchCodeCloudStorage(sku);
  } else if (sku.serviceId === "9662-B51E-5089") { //Cloud SQL
    return `${sku.serviceRegion}/sql/` + calculateSearchCloudSql(sku);
  } else if (sku.serviceId === "CCD8-9BF1-090E") { //GKE
    const code = sku.description.startsWith("Regional") ? "regional" : "zonal";
    return `${sku.serviceRegion}/gke/k8///${code}`;
  }
  return "";
}

/** Add new and update existing skus to database */
async function updateGoogleCloudSkus(skus: GoogleCloudSkuFlat[]) {
  try {
    const bulkOps = skus.map((sku) => ({
      updateOne: {
        filter: {skuId: sku.skuId},
        update: {$set: sku},
        upsert: true,
      },
    }));
    const resultBulk = await GoogleCloudPriceModel.bulkWrite(bulkOps);
    log.info(`GoogleCloud SKUs processed: ${resultBulk.modifiedCount} updated / ${resultBulk.upsertedCount} added`);
  } catch (error) {
    log.error("Error updating Google Cloud SKU prices: " + error);
    throw error;
  }
}

/** Function to insert fetched skus into database */
/*async function insertGoogleCloudSkus(skus: GoogleCloudSkuFlat[]) {
  //remove temporal collection with drop
  //GoogleCloudTempPrice.collection.drop();
  try {
    const result = await GoogleCloudPriceModel.insertMany(skus);
    log.info(`GoogleCloud SKUs fetched into db: ${result.length}`);
  } catch (error) {
    log.error("Error fetching GoogleCloud prices:" + error);
    throw error;
  }
}*/

/** Function to display all fields of all skus in csv format */
/*function printAllSkus(skus: GoogleCloudSkuFlat[]) {
  for (const sku of skus) {
    log.debug(
      `${sku.serviceId};${sku.skuId};${sku.description};${sku.resourceFamily};` +
        `${sku.resourceGroup};${sku.usageType};${sku.serviceRegions};${sku.pricingInfo.usageUnit};` +
        `${sku.pricingInfo.displayQuantity};${sku.pricingInfo.startUsageAmount};${sku.pricingInfo.currencyCode};` +
        `${sku.pricingInfo.price};${sku.pricingInfo.usageUnitDescription};${sku.pricingInfo.baseUnit};` +
        `${sku.pricingInfo.baseUnitDescription};${sku.pricingInfo.baseUnitConversionFactor};${sku.geoTaxonomyType}`,
    );
  }
}*/

export {fetchGoogleCloudSkus, processGoogleCloudSkus};
