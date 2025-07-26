/** Schema and model for AmazonCloudPriceStat */
import mongoose from "mongoose";
import { AmazonCloudSkuStat } from "../types.ts";

const Schema = mongoose.Schema;

const AmazonCloudPriceStatSchema = new Schema({
  dateCode: { type: String, required: true },
  rateCode: { type: String, required: true },
  regionCode: { type: String, required: true },
  productFamily: { type: String, required: true },
  instanceType: String,
  volumeApiName: String,
  leaseContractLength: String,
  deploymentOption: String,
  startingRange: String,
  databaseEngine: String,
  priceDescription: { type: String, required: true },
  price: { type: Number, required: true },
}, { timestamps: true });

/** create an index for that can be unique */
AmazonCloudPriceStatSchema.index({ dateCode: 1, rateCode: 1 }, { unique: true });

export type AmazonCloudPriceStatModelType = mongoose.Document & Omit<AmazonCloudSkuStat, "id">;
export default mongoose.model<AmazonCloudPriceStatModelType>("AmazonCloudPriceStat", AmazonCloudPriceStatSchema);
