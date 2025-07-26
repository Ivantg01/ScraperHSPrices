import * as log from "@std/log";
import {format} from "@std/datetime";
import {OracleCloudSkuStat} from "../types.ts";
import OracleCloudPriceModel from "../models/OracleCloudPrice.ts";
import OracleCloudPriceStatModel from "../models/OracleCloudPriceStat.ts";

/** Process Oracle Cloud SKUs */
async function processOracleCloudStats(batchSize = 2000) {
  try {
    const numRecords = await OracleCloudPriceModel.countDocuments();
    log.info(`OracleCloud processing statistics: ${numRecords}`);

    // Get dateCode with format YYYYMMDD
    const dateCode = format(new Date(), "yyyyMMdd");
    const startDate = new Date();
    let newStats = 0;

    for (let skip = 0; skip < numRecords; skip += batchSize) {
      const skus = await OracleCloudPriceModel
        .find({})
        .skip(skip)
        .limit(batchSize);

      //{region} {serviceDisplayName} {resourceFamily} {resourceGroup} {usageType} {geoTaxonomy} {virtualMachineType} {usageType}
      const stats: OracleCloudSkuStat[] = skus.map((sku) => {
        return {
          dateCode: dateCode,
          partNumber: sku.partNumber,
          displayName: sku.displayName,
          metricName: sku.metricName,
          serviceCategory: sku.serviceCategory,
          value: sku.value,
        };
      });
      newStats += await updateOracleCloudSkuStats(stats);
    }
    log.info(`OracleCloud statistics added: ${newStats} in ${new Date().getTime() - startDate.getTime()} ms`);
  } catch (error) {
    log.error("Error saving Oracle Cloud stats: " + error);
  }
}

/** Add new and update existing skus statistics to database */
async function updateOracleCloudSkuStats(skus: OracleCloudSkuStat[]): Promise<number> {
  try {
    const bulkOps = skus.map((sku) => ({
      updateOne: {
        filter: {dateCode: sku.dateCode, partNumber: sku.partNumber},
        update: {$set: sku},
        upsert: true,
      },
    }));
    const resultBulk = await OracleCloudPriceStatModel.bulkWrite(bulkOps);
    log.debug(`-OracleCloud Stats processed: ${resultBulk.modifiedCount} updated / ${resultBulk.upsertedCount} added`);
    return resultBulk.modifiedCount + resultBulk.upsertedCount;
  } catch (error) {
    log.error("Error updating Oracle Cloud Stats: " + error);
    throw error;
  }
}

export {processOracleCloudStats};
