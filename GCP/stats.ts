import * as log from "@std/log";
import {format} from "@std/datetime";
import {GoogleCloudSkuStat} from "../types.ts";
import GoogleCloudPriceModel from "../models/GoogleCloudPrice.ts";
import GoogleCloudPriceStatModel from "../models/GoogleCloudPriceStat.ts";

/** Process Google Cloud SKUs */
async function processGoogleCloudStats(batchSize = 2000) {
  try {
    const numRecords = await GoogleCloudPriceModel.countDocuments();
    log.info(`GoogleCloud processing statistics: ${numRecords}`);

    // Get dateCode with format YYYYMMDD
    const dateCode = format(new Date(), "yyyyMMdd");
    const startDate = new Date();
    let newStats = 0;

    for (let skip = 0; skip < numRecords; skip += batchSize) {
      const skus = await GoogleCloudPriceModel
        .find({})
        .skip(skip)
        .limit(batchSize);

      // filter if needed in the future
      //const stats = skus.filter((doc) => {
      //  return true;
      //});
      //{region} {serviceDisplayName} {resourceFamily} {resourceGroup} {usageType} {geoTaxonomy} {virtualMachineType} {usageType}
      const stats: GoogleCloudSkuStat[] = skus.map((sku) => {
        const [_s0, _s1, s2, s3, s4, s5, s6] = sku.searchCode.split("/");
        return {
          dateCode: dateCode,
          skuId: sku.skuId,
          description: sku.description,
          serviceRegion: sku.serviceRegion,
          serviceDisplayName: sku.serviceDisplayName,
          resourceFamily: s2,
          resourceGroup: s3 || undefined,
          usageType: s4 || undefined,
          geoTaxonomy: s5 || undefined,
          virtualMachineType: s6 || undefined,
          price: sku.price,
        };
      });
      newStats += await updateGoogleCloudSkuStats(stats);
    }
    log.info(`GoogleCloud statistics added: ${newStats} in ${new Date().getTime() - startDate.getTime()} ms`);
  } catch (error) {
    log.error("Error saving Google Cloud stats: " + error);
  }
}

/** Add new and update existing skus statistics to database */
async function updateGoogleCloudSkuStats(skus: GoogleCloudSkuStat[]): Promise<number> {
  try {
    const bulkOps = skus.map((sku) => ({
      updateOne: {
        filter: {dateCode: sku.dateCode, skuId: sku.skuId},
        update: {$set: sku},
        upsert: true,
      },
    }));
    const resultBulk = await GoogleCloudPriceStatModel.bulkWrite(bulkOps);
    log.debug(`-GoogleCloud Stats processed: ${resultBulk.modifiedCount} updated / ${resultBulk.upsertedCount} added`);
    return resultBulk.modifiedCount + resultBulk.upsertedCount;
  } catch (error) {
    log.error("Error updating Google Cloud Stats: " + error);
    throw error;
  }
}

export {processGoogleCloudStats};
