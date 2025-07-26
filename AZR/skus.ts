import "@std/dotenv/load";
import * as log from "@std/log";
import * as path from "jsr:@std/path";
import {AzureCloudProduct, AzureCloudSkuApi, AzureCloudSkuFlat} from "../types.ts";
import AzureCloudPriceModel from "../models/AzureCloudPrice.ts";
import {saveTextDataToFile} from "../utils/file.ts";
import {handleFetchWithRetry} from "../utils/fetch.ts";
import {azureCloudDefaultRegions} from "../utils/dbDefaultContent.ts";

interface ApiResponse {
  Items: AzureCloudSkuApi[];
  NextPageLink: string;
}

/** function to fetch SKUs of selected Azure Cloud service into an array */
async function fetchAzureCloudSkus(
  product: AzureCloudProduct,
): Promise<AzureCloudSkuApi[]> {
  const baseurl = Deno.env.get("WEBSIMULATOR_ENABLE") === "True"
    ? `http://${Deno.env.get("WEBSIMULATOR_HOST")}:${Deno.env.get("WEBSIMULATOR_PORT")}`
    : "https://prices.azure.com";
  const pathUrl = `/api/retail/prices?$filter=productId%20eq%20%27${product.productId}%27`;
  let url = baseurl + pathUrl;
  let allSkus: AzureCloudSkuApi[] = [];
  let totalFetchCount = 0;

  while (url !== "") {
    log.debug(`-Fetching AzureCloud SKUs ${url}`);
    try {
      const response = await handleFetchWithRetry(url);

      const text = await response.text();
      const data: ApiResponse = JSON.parse(text);
      const currentFetchCount = data.Items?.length || 0;
      totalFetchCount += currentFetchCount;
      log.debug(`-Fetched ${currentFetchCount} AzureCloud skus in this request.`);
      if (Deno.env.get("STORE_FETCH_CONTENT") === "True") {
        //ej url="https://prices.azure.com/api/retail/prices?$filter=productId%20eq%20%27DZH318Z0BP04%27"
        const filename = path.join(Deno.cwd(), "tests", "download", "AZR", url.split("filter=")[1] + ".json");
        await saveTextDataToFile(text, filename);
      }

      allSkus = allSkus.concat(data.Items);
      url = data.NextPageLink || "";
      //If url is like prices.azure.com:443, replace by local webserver url
      if (Deno.env.get("WEBSIMULATOR_ENABLE") === "True") {
        url = url.replace(
          "https://prices.azure.com:443",
          `http://${Deno.env.get("WEBSIMULATOR_HOST")}:${Deno.env.get("WEBSIMULATOR_PORT")}`,
        );
      }
    } catch (error) {
      log.error(`Error fetching AzureCloud SKUs of ${product.productName}: ${error}`);
      break;
    }
  }

  log.debug(`AzureCloud SKUs fetched of ${product.productName}: ${allSkus.length}`);
  return allSkus;
}

/** Process fetched Azure Cloud SKUs into a flat array to be saved in a database */
async function processAzureCloudSkus(skus: AzureCloudSkuApi[]) {
  const skusFlat: AzureCloudSkuFlat[] = skus.map((sku) => {
    return {
      searchCode: "",
      currencyCode: sku.currencyCode,
      tierMinimumUnits: sku.tierMinimumUnits,
      reservationTerm: sku.reservationTerm || "",
      price: sku.unitPrice,
      armRegionName: sku.armRegionName,
      location: sku.location,
      effectiveStartDate: new Date(sku.effectiveStartDate),
      meterId: sku.meterId,
      meterName: sku.meterName,
      productId: sku.productId,
      skuId: sku.skuId,
      productName: sku.productName,
      skuName: sku.skuName,
      serviceName: sku.serviceName,
      serviceId: sku.serviceId,
      serviceFamily: sku.serviceFamily,
      unitOfMeasure: sku.unitOfMeasure,
      type: sku.type,
      isPrimaryMeterRegion: sku.isPrimaryMeterRegion,
      armSkuName: sku.armSkuName,
    };
  })
    .filter(isValidAzureCloudSku)
    .map((sku) => ({
      ...sku,
      searchCode: calculateSearchCode(sku),
      skuId: calculateSkuId(sku),
    }));

  //bulkOps to update GoogleCloudPrice from GoogleCloudTempPrice
  await updateAzureCloudSkus(skusFlat);
}

/** Filter SKUs fetched from Amazon Cloud that are not interesting */
function isValidAzureCloudSku(sku: AzureCloudSkuFlat): boolean {
  function isValidVmType(sku: AzureCloudSkuFlat): boolean {
    //select the most interesting VMs SKUs, e.g. restricted areas are not included
    return azureCloudDefaultRegions.some((region) => region.name === sku.armRegionName) &&
      !sku.skuName.includes("Low Priority") && !sku.skuName.includes("Spot");
  }

  function isValidAksType(sku: AzureCloudSkuFlat): boolean {
    return azureCloudDefaultRegions.some((region) => region.name === sku.armRegionName);
  }

  function isValidStorageType(sku: AzureCloudSkuFlat): boolean {
    return azureCloudDefaultRegions.some((region) => region.name === sku.armRegionName) &&
      ((sku.productName.endsWith("Disks") && sku.meterName.endsWith("Disk")) || //Valid SSD/HDD Managed Disks
        (sku.productName === "Files v2" && sku.meterName === "Cool GRS Data Stored") ||
        (sku.productName === "General Block Blob v2" && sku.meterName.endsWith(" ZRS Data Stored") &&
          sku.tierMinimumUnits === 0));
  }

  function isValidStorageBandwidth(sku: AzureCloudSkuFlat): boolean {
    return azureCloudDefaultRegions.some((region) => region.name === sku.armRegionName) &&
      sku.meterName.endsWith("Out");
  }

  function isValidDatabaseType(sku: AzureCloudSkuFlat): boolean {
    //select flexible server storage
    return azureCloudDefaultRegions.some((region) => region.name === sku.armRegionName) &&
      (sku.meterName === "vCore" || sku.skuName === "Storage" || sku.skuName === "Backup Storage LRS" ||
        sku.skuName === "Standard");
  }

  if (sku.serviceName === "Virtual Machines" && !isValidVmType(sku)) {
    return false;
  } else if (sku.serviceName === "Azure Kubernetes Service" && !isValidAksType(sku)) {
    return false;
  } else if (sku.serviceName === "Storage" && !isValidStorageType(sku)) {
    return false;
  } else if (sku.serviceName === "Bandwidth" && !isValidStorageBandwidth(sku)) {
    return false;
  } else if (sku.serviceName === "Azure Database for PostgreSQL" && !isValidDatabaseType(sku)) {
    return false;
  }
  return true;
}

/** Calculate a search code for a SKU to search SKUs quickly */
function calculateSearchCode(sku: AzureCloudSkuFlat): string {
  //Code= {region} /{service} /{product} /{armSkuName}   /{reservationTerm}  / {tierMin}
  //
  //Virtual Machines:
  //      region   /vm        /cmp       /[M128ds_v2|...]/[1y/3y|od]
  //Azure Kubernetes Service
  //      region   /aks       /k8        /[sla|lts]
  //Storage
  //      region   /str       /[ssd|...] /[Hot ZRS|...]  /[1y/3y|od]
  //Bandwidth
  //      region   /net       /egress    /std            /                   /[0,10,...]
  //Azure Database for PostgreSQL
  //      region   /sql       /cpu       /[Edsv4|...]    /[1y/3y|od]
  //      region   /sql       /str       /[backup|...]
  const codeMap = {
    //VM & Storage
    "1y": "1 Year",
    "3y": "3 Years",
  };

  function getCodeByDesc(desc: string | undefined): string | undefined {
    return Object.keys(codeMap).find((code) => desc?.endsWith(codeMap[code as keyof typeof codeMap]));
  }

  function calculateSearchCodeStorage(sku: AzureCloudSkuFlat): string {
    if (sku.productName.startsWith("Files")) {
      return "files";
    } else if (sku.productName.startsWith("General Block Blob")) {
      return "blob";
    } else if (sku.productName.startsWith("Standard SSD")) {
      return "ssd";
    } else if (sku.productName.startsWith("Standard HDD")) {
      return "hdd";
    } else if (sku.productName.startsWith("Premium SSD")) {
      return "pssd";
    }
    return "";
  }

  function calculateSearchCodeDatabase(sku: AzureCloudSkuFlat): string {
    //ej: armSkuName = AzureDB_PostgreSQL_Flexible_Server_General_Purpose_Ddsv4Series_Compute
    //ej: skuName = "xx vCore" or just "vCores"
    //return Dxxd_sv4
    if (sku.armSkuName.endsWith("Series_Compute")) {
      // remove ending "Series_Compute" and get the serie type
      const compute_serie = sku.armSkuName.slice(0, -14).split("_").pop() || "";
      if (compute_serie.length > 2 && compute_serie[compute_serie.length - 2] === "v") {
        // Get cores from skuName e.g. '4 vCores'. If not cores default is 1
        const match = sku.skuName.match(/^(\d+)/);
        const cores = match ? match[1] : "1";
        const serie = `${compute_serie[0]}${cores}${compute_serie.slice(1, -2)}_${compute_serie.slice(-2)}`;
        const code = getCodeByDesc(sku.reservationTerm);
        return `cpu/${serie}/` + (code ?? "od");
      }
    } else if (sku.skuName === "Storage") {
      return "str/storage";
    } else if (sku.skuName === "Backup Storage LRS") {
      return "str/backup";
    } else if (sku.skuName === "Standard") {
      return "str/standard";
    }
    return "";
  }

  if (sku.serviceName === "Virtual Machines") {
    const code = getCodeByDesc(sku.reservationTerm);
    return `${sku.armRegionName}/vm/cmp/${sku.armSkuName}/` + (code ?? "od");
  } else if (sku.serviceName === "Azure Kubernetes Service") {
    const code = (sku.meterName.includes("SLA")) ? "sla" : "lts";
    return `${sku.armRegionName}/aks/k8/${code}`;
  } else if (sku.serviceName === "Storage") {
    const code = getCodeByDesc(sku.reservationTerm);
    const productName = calculateSearchCodeStorage(sku);
    return `${sku.armRegionName}/str/${productName}/${sku.skuName}/` + (code ?? "od");
  } else if (sku.serviceName === "Bandwidth") {
    return `${sku.armRegionName}/net/egress/std//${sku.tierMinimumUnits}`;
  } else if (sku.serviceName === "Azure Database for PostgreSQL") {
    return `${sku.armRegionName}/sql/` + calculateSearchCodeDatabase(sku);
  }
  return "";
}

/** Calculate an extended skuId to make it unique as it is repeated in some skuIds */
function calculateSkuId(sku: AzureCloudSkuFlat): string {
  if (sku.serviceName === "Bandwidth") {
    //Bandwidth serviceName has repeated skuId
    return `${sku.skuId}/${sku.tierMinimumUnits}`;
  } else if (sku.serviceName === "Azure Kubernetes Service") {
    //AKS has repeated skuId for SLA and LTS
    return (sku.meterName.includes("SLA")) ? `${sku.skuId}/sla` : `${sku.skuId}/lts`;
  }
  return sku.skuId;
}

/** Add new and update existing skus to database */
async function updateAzureCloudSkus(skus: AzureCloudSkuFlat[]) {
  try {
    const bulkOps = skus.map((sku) => ({
      updateOne: {
        filter: {skuId: sku.skuId},
        update: {$set: sku},
        upsert: true,
      },
    }));
    const resultBulk = await AzureCloudPriceModel.bulkWrite(bulkOps);
    log.debug(`--SKUs processed: ${resultBulk.modifiedCount} updated / ${resultBulk.upsertedCount} added`);
  } catch (error) {
    log.error("Error updating Azure Cloud prices: " + error);
    throw error;
  }
}

/** Function to display all fields of all skus in csv format */
/*function printAllSkus(skus: AzureCloudSkuFlat[]) {
  for (const sku of skus) {
    log.debug(
      `${sku.currencyCode};${sku.skuId};${sku.tierMinimumUnits};${sku.reservationTerm};` +
        `${sku.price};${sku.armRegionName};${sku.location};${sku.effectiveStartDate};${sku.meterId};` +
        `${sku.meterName};${sku.productId};${sku.skuId};${sku.productName};${sku.skuName};` +
        `${sku.serviceName};${sku.serviceId};${sku.serviceFamily};${sku.unitOfMeasure};${sku.type};` +
        `${sku.isPrimaryMeterRegion};${sku.armSkuName}`,
    );
  }
}*/

export {fetchAzureCloudSkus, processAzureCloudSkus};
