import "@std/dotenv/load";
import * as log from "@std/log";
import * as path from "jsr:@std/path";
import {parse} from "@std/csv/parse";
import {TextLineStream} from "@std/streams/text-line-stream";
import {AmazonCloudService, AmazonCloudSkuFlat} from "../types.ts";
import AmazonCloudPriceModel from "../models/AmazonCloudPrice.ts";
import {fetchToFile} from "../utils/fetch.ts";

/** function to fetch SKUs of selected Amazon Cloud service into a file
 *
 * @param service is the Amazon Cloud service to fetch
 * @param regionName is the name of the Amazon Cloud region to fetch (optional)
 * return name of the file downloaded
 */
async function fetchAmazonCloudSkus(
  service: AmazonCloudService,
  regionName?: string,
): Promise<string> {
  const baseurl = Deno.env.get("WEBSIMULATOR_ENABLE") === "True"
    ? `http://${Deno.env.get("WEBSIMULATOR_HOST")}:${Deno.env.get("WEBSIMULATOR_PORT")}`
    : "https://pricing.us-east-1.amazonaws.com";
  const pathUrl = (typeof regionName !== "undefined")
    ? `/offers/v1.0/aws/${service.serviceId}/current/${regionName}/index.csv`
    : `/offers/v1.0/aws/${service.serviceId}/current/index.csv`;
  const url = baseurl + pathUrl;
  const filename = (typeof regionName !== "undefined")
    ? path.join(Deno.cwd(), "tests", "download", "AWS", `${service.serviceId}_${regionName}.csv`)
    : path.join(Deno.cwd(), "tests", "download", "AWS", `${service.serviceId}.csv`);

  log.debug(`Fetching AmazonCloud SKUs ${url} -> ${filename}`);
  try {
    await fetchToFile(url, filename);
  } catch (error) {
    log.error(`Error fetching AmazonCloud SKUs of ${service.serviceId}: ${error}`);
  }

  const filesize = (await Deno.stat(filename)).size;
  log.debug(`-AmazonCloud SKUs fetched of ${service.serviceId}: ${filesize} bytes`);
  return filename;
}

/** Process fetched Amazon Cloud SKUs into a flat array to be saved in a database */
async function processAmazonCloudSkus(skusFilename: string, batchSize = 20000): Promise<number> {
  let chunks: string[] = [];
  let headerFound = false;
  let lineCounter = 0;
  let skuCounter = 0;
  const file = await Deno.open(skusFilename, {read: true});
  const lines = file.readable
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new TextLineStream());

  //process a set of lines with skus chunk by chunk to optimice memory
  for await (const line of lines) {
    if (!headerFound) {
      if (line.startsWith('"SKU"')) {
        chunks.push(line);
        headerFound = true;
      }
      continue;
    }
    chunks.push(line);
    lineCounter++;

    if (lineCounter % batchSize === 0) {
      const skusFlat = parseAmazonCloudSkus(chunks.join("\n"));
      //bulkOps to update GoogleCloudPrice from GoogleCloudTempPrice
      await updateAmazonCloudSkus(skusFlat);
      chunks = headerFound ? [chunks[0]] : [];
      skuCounter += skusFlat.length;
    }
  }
  // Process remaining ones
  if (chunks.length > 0) {
    const skusFlat = parseAmazonCloudSkus(chunks.join("\n"));
    //bulkOps to update GoogleCloudPrice from GoogleCloudTempPrice
    await updateAmazonCloudSkus(skusFlat);
    skuCounter += skusFlat.length;
  }

  log.debug(`-AmazonCloud SKUs ${skuCounter} of ${lineCounter} lines from ${skusFilename}`);
  return lineCounter;
}

/** Parse the csv files fetched from Amazon Cloud to format and filter data to add to the database */
function parseAmazonCloudSkus(lines: string): AmazonCloudSkuFlat[] {
  try {
    const record = parse(lines, {skipFirstRow: true, fieldsPerRecord: 0});
    return record
      .map((sku: Record<string, string>): AmazonCloudSkuFlat => {
        return {
          searchCode: "",
          rateCode: sku.RateCode,
          serviceCode: sku.serviceCode,
          regionCode: sku["Region Code"] || sku["From Region Code"] || "",
          termType: sku.TermType,
          leaseContractLength: sku.LeaseContractLength || undefined,
          purchaseOption: sku.PurchaseOption || undefined,
          offeringClass: sku.OfferingClass || undefined,
          priceDescription: sku.PriceDescription,
          startingRange: sku.StartingRange || undefined,
          endingRange: sku.EndingRange || undefined,
          unit: sku.Unit,
          price: Number(sku.PricePerUnit),
          currency: sku.Currency,
          productFamily: sku["Product Family"],
          usageType: sku.usageType,
          storageMedia: sku["Storage Media"] || undefined,
          volumeType: sku["Volume Type"] || undefined,
          volumeApiName: sku["Volume API Name"] || undefined,
          fromLocationType: sku["From Location Type"] || undefined,
          operation: sku.operation || undefined,
          instanceType: sku["Instance Type"] || sku.InstanceType || undefined,
          tenancy: sku.Tenancy || undefined,
          databaseEngine: sku["Database Engine"] || undefined,
          databaseEdition: sku["Database Edition"] || undefined,
          deploymentOption: sku["Deployment Option"] || undefined,
          licenseModel: sku["License Model"] || undefined,
        };
      })
      .filter(isValidAmazonCloudSku)
      .map((sku) => ({
        ...sku,
        searchCode: calculateSearchCode(sku),
      }));
  } catch (error) {
    log.error("-AmazonCloud SKUs parse error: " + error);
    return [];
  }
}

/** Filter SKUs fetched from Amazon Cloud that are not interesting */
function isValidAmazonCloudSku(sku: AmazonCloudSkuFlat): boolean {
  function isValidEc2Type(sku: AmazonCloudSkuFlat): boolean {
    //select the most interesting EC2 SKUs
    return (sku.productFamily === "Compute Instance" && sku.operation === "RunInstances" && sku.tenancy === "Shared" &&
        (sku.termType === "OnDemand" || sku.purchaseOption === "No Upfront") &&
        sku.offeringClass !== "standard" && sku.price > 0 && !sku.priceDescription.includes("Unused Reservation")) ||
      sku.volumeType !== "Provisioned IOPS" && (sku.productFamily === "Storage");
  }

  function isValidRdsType(sku: AmazonCloudSkuFlat): boolean {
    //select the most interesting RDS SKUs
    return sku.databaseEngine === "PostgreSQL" &&
      (sku.termType === "OnDemand" || sku.purchaseOption === "No Upfront") &&
      (sku.productFamily === "Database Instance" || sku.productFamily === "Database Storage" ||
        sku.productFamily === "Storage Snapshot") &&
      !sku.volumeType?.includes("Provisioned IOPS") && sku.deploymentOption !== "Multi-AZ (readable standbys)" &&
      sku.price > 0;
  }

  function isValidS3Type(sku: AmazonCloudSkuFlat): boolean {
    return sku.volumeType === "Standard" && sku.startingRange === "0";
  }

  function isValidEksType(sku: AmazonCloudSkuFlat): boolean {
    return sku.usageType.endsWith("-AmazonEKS-Hours:perCluster") || sku.usageType.endsWith("-Fargate-GB-Hours") ||
      sku.usageType.endsWith("-Fargate-vCPU-Hours:perCPU") ||
      sku.usageType.endsWith("-Fargate-EphemeralStorage-GB-Hours");
  }

  if (sku.serviceCode === "AmazonEC2" && !isValidEc2Type(sku)) {
    return false;
  } else if (sku.serviceCode === "AmazonRDS" && !isValidRdsType(sku)) {
    return false;
  } else if (sku.serviceCode === "AmazonS3" && !isValidS3Type(sku)) {
    return false;
  } else if (sku.serviceCode === "AmazonEKS" && !isValidEksType(sku)) {
    return false;
  } else if (
    sku.serviceCode === "AWSDataTransfer" &&
    (sku.fromLocationType !== "AWS Region"! || !sku.priceDescription.includes("month data transfer out"))
  ) {
    return false;
  }
  return true;
}

/** Calculate a search code for a SKU to search SKUs quickly */
function calculateSearchCode(sku: AmazonCloudSkuFlat): string {
  const codeMap = {
    //Code= {region} /{service} /{family} /{type}           /{leaseContract} /{deployment}        /{endingRange}
    //AmazonEC2
    //      region   /ec2       /cmp      /[a1.large|...]   /[1y|3y|od]
    //      region   /ec2       /str      /[gp2|...]
    //AmazonRDS
    //      region   /rds       /cmp     /[db.t3.micro|...] /[1y|3y|od]      /[Single-AZ|Multi-AZ]
    //      region   /rds       /str     /[gp2|...]         /                /[Single-AZ|Multi-AZ]
    //      region   /rds       /snapshot
    //AmazonS3
    //      region   /s3        /str      /std
    //AmazonEKS
    //      region   /eks       /[ctr|ram|cpu|str]
    //AWSDataTransfer
    //      region   /net       /dt       /out               /               /                   /[0|...]

    //EC2
    "1y": "1yr",
    "3y": "3yr",
    //RDS
    "gp": "General Purpose",
    "gp3": "General Purpose-GP3",
    "hdd": "Magnetic",
    //EKS
    "ctr": "-AmazonEKS-Hours:perCluster",
    "ram": "-Fargate-GB-Hours",
    "cpu": "-Fargate-vCPU-Hours:perCPU",
    "str": "-Fargate-EphemeralStorage-GB-Hours",
  };

  function getCodeByDesc(desc: string | undefined): string | undefined {
    return Object.keys(codeMap).find((code) => desc?.endsWith(codeMap[code as keyof typeof codeMap]));
  }

  function calculateSearchCodeEc2(sku: AmazonCloudSkuFlat): string {
    if (sku.productFamily === "Compute Instance") {
      const code = getCodeByDesc(sku.leaseContractLength) ?? "od";
      return "cmp/" + sku.instanceType + "/" + code;
    } else if (sku.productFamily === "Storage") {
      return "str/" + (sku.volumeApiName ?? "");
    }
    return "";
  }

  function calculateSearchCodeRds(sku: AmazonCloudSkuFlat): string {
    if (sku.productFamily === "Database Instance") {
      const code = getCodeByDesc(sku.leaseContractLength) ?? "od";
      return "cmp/" + sku.instanceType + "/" + code + "/" + sku.deploymentOption;
    } else if (sku.productFamily === "Database Storage") {
      const code = getCodeByDesc(sku.volumeType);
      return "str/" + code + "//" + sku.deploymentOption;
    } else if (sku.productFamily === "Storage Snapshot") {
      return "snp";
    }
    return "";
  }

  if (sku.serviceCode === "AmazonEC2") {
    return `${sku.regionCode}/ec2/` + calculateSearchCodeEc2(sku);
  } else if (sku.serviceCode === "AmazonRDS") {
    return `${sku.regionCode}/rds/` + calculateSearchCodeRds(sku);
  } else if (sku.serviceCode === "AmazonS3") {
    return `${sku.regionCode}/s3/str/std`;
  } else if (sku.serviceCode === "AmazonEKS") {
    const code = getCodeByDesc(sku.usageType);
    return code ? `${sku.regionCode}/eks/${code}` : "";
  } else if (sku.serviceCode === "AWSDataTransfer") {
    return `${sku.regionCode}/net/dt/out///${sku.endingRange}`;
  }
  return "";
}

/** Add new and update existing skus to database */
async function updateAmazonCloudSkus(skus: AmazonCloudSkuFlat[]) {
  if (skus.length > 0 && skus[0].searchCode === "") { //temporal
    log.info("AmazonCloud SKUs not saved");
    return;
  }
  try {
    const bulkOps = skus.map((sku) => ({
      updateOne: {
        filter: {rateCode: sku.rateCode},
        update: {$set: sku},
        upsert: true,
      },
    }));
    const resultBulk = await AmazonCloudPriceModel.bulkWrite(bulkOps);
    log.debug(`--SKUs processed: ${resultBulk.modifiedCount} updated / ${resultBulk.upsertedCount} added`);
  } catch (error) {
    log.error("Error updating Amazon Cloud prices: " + error);
    throw error;
  }
}

export {fetchAmazonCloudSkus, processAmazonCloudSkus};
