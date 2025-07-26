import * as log from "@std/log";
import {format} from "@std/datetime";
import {AmazonCloudSkuStat} from "../types.ts";
import AmazonCloudPriceModel from "../models/AmazonCloudPrice.ts";
import AmazonCloudPriceStatModel from "../models/AmazonCloudPriceStat.ts";

/** Process Amazon Cloud SKUs */
async function processAmazonCloudStats(batchSize = 2000) {
  try {
    const numRecords = await AmazonCloudPriceModel.countDocuments();
    log.info(`AmazonCloud processing statistics: ${numRecords}`);

    // Get dateCode with format YYYYMMDD
    const dateCode = format(new Date(), "yyyyMMdd");
    const startDate = new Date();
    let newStats = 0;

    for (let skip = 0; skip < numRecords; skip += batchSize) {
      const skus = await AmazonCloudPriceModel
        .find({})
        .skip(skip)
        .limit(batchSize);

      //{region} /{service} /{family} /{type}           /{leaseContract} /{deployment}        /{endingRange}
      const stats: AmazonCloudSkuStat[] = skus.map((sku) => {
        const [_s0, s1, s2, s3, s4] = sku.searchCode.split("/");
        return {
          dateCode: dateCode,
          rateCode: sku.rateCode,
          regionCode: sku.regionCode,
          productFamily: s1 + "/" + s2,
          instanceType: sku.instanceType,
          volumeApiName: (s2 === "str") ? s3 : undefined,
          leaseContractLength: s4 || undefined,
          deploymentOption: sku.deploymentOption !== "" ? sku.deploymentOption?.slice(0, 1) : undefined, //(M)ulti or (S)ingle
          startingRange: sku.startingRange || undefined,
          priceDescription: sku.priceDescription,
          price: sku.price,
        };
      });
      newStats += await updateAmazonCloudSkuStats(stats);
    }
    log.info(`AmazonCloud statistics added: ${newStats} in ${new Date().getTime() - startDate.getTime()} ms`);
  } catch (error) {
    log.error("Error saving Amazon Cloud stats: " + error);
  }
}

/** Add new and update existing skus statistics to database */
async function updateAmazonCloudSkuStats(skus: AmazonCloudSkuStat[]): Promise<number> {
  try {
    const bulkOps = skus.map((sku) => ({
      updateOne: {
        filter: {dateCode: sku.dateCode, rateCode: sku.rateCode},
        update: {$set: sku},
        upsert: true,
      },
    }));
    const resultBulk = await AmazonCloudPriceStatModel.bulkWrite(bulkOps);
    log.debug(`-AmazonCloud Stats processed: ${resultBulk.modifiedCount} updated / ${resultBulk.upsertedCount} added`);
    return resultBulk.modifiedCount + resultBulk.upsertedCount;
  } catch (error) {
    log.error("Error updating Amazon Cloud Stats: " + error);
    throw error;
  }
}

export {processAmazonCloudStats};
