/** Schema and model for AzureCloudPriceStat */
import mongoose from "mongoose";
import { AzureCloudSkuStat } from "../types.ts";

const Schema = mongoose.Schema;

const AzureCloudPriceStatSchema = new Schema({
  dateCode: { type: String, required: true },
  skuId: { type: String, required: true },
  armRegionName: { type: String, required: true },
  productId: { type: String, required: true },
  productName: { type: String, required: true },
  skuName: { type: String, required: true },
  reservationTerm: { type: String, required: false },
  tierMinimumUnits: { type: Number, required: true },
  price: { type: Number, required: true },
}, { timestamps: true });

/** create an index for that can be unique */
AzureCloudPriceStatSchema.index({ dateCode: 1, skuId: 1 }, { unique: true });

export type AzureCloudPriceStatModelType = mongoose.Document & Omit<AzureCloudSkuStat, "id">;
export default mongoose.model<AzureCloudPriceStatModelType>("AzureCloudPriceStat", AzureCloudPriceStatSchema);
