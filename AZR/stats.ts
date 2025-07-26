import * as log from "@std/log";
import {format} from "@std/datetime";
import {AzureCloudSkuStat} from "../types.ts";
import AzureCloudPriceModel from "../models/AzureCloudPrice.ts";
import AzureCloudPriceStatModel from "../models/AzureCloudPriceStat.ts";

/** Process Azure Cloud SKUs */
async function processAzureCloudStats(batchSize = 2000) {
  try {
    const numRecords = await AzureCloudPriceModel.countDocuments();
    log.info(`AzureCloud processing statistics: ${numRecords}`);

    // Get dateCode with format YYYYMMDD
    const dateCode = format(new Date(), "yyyyMMdd");
    const startDate = new Date();
    let newStats = 0;

    for (let skip = 0; skip < numRecords; skip += batchSize) {
      const skus = await AzureCloudPriceModel
        .find({})
        .skip(skip)
        .limit(batchSize);

      //{region} {service} {product} {skuName} {reservationTerm}  {tierMin}
      const stats: AzureCloudSkuStat[] = skus.map((sku) => {
        const [_s0, _s1, _s2, s3, s4] = sku.searchCode.split("/");
        return {
          dateCode: dateCode,
          skuId: sku.skuId,
          armRegionName: sku.armRegionName,
          productId: sku.productId,
          productName: sku.productName,
          skuName: s3,
          reservationTerm: s4,
          tierMinimumUnits: sku.tierMinimumUnits,
          price: sku.price,
        };
      });
      newStats += await updateAzureCloudSkuStats(stats);
    }
    log.info(`AzureCloud statistics added: ${newStats} in ${new Date().getTime() - startDate.getTime()} ms`);
  } catch (error) {
    log.error("Error saving Azure Cloud stats: " + error);
  }
}

/** Add new and update existing skus statistics to database */
async function updateAzureCloudSkuStats(skus: AzureCloudSkuStat[]): Promise<number> {
  try {
    const bulkOps = skus.map((sku) => ({
      updateOne: {
        filter: {dateCode: sku.dateCode, skuId: sku.skuId},
        update: {$set: sku},
        upsert: true,
      },
    }));
    const resultBulk = await AzureCloudPriceStatModel.bulkWrite(bulkOps);
    log.debug(`-AzureCloud Stats processed: ${resultBulk.modifiedCount} updated / ${resultBulk.upsertedCount} added`);
    return resultBulk.modifiedCount + resultBulk.upsertedCount;
  } catch (error) {
    log.error("Error updating Azure Cloud Stats: " + error);
    throw error;
  }
}

export {processAzureCloudStats};
