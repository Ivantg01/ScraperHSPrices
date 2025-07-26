/** Schema and model for GoogleCloudPriceStat */
import mongoose from "mongoose";
import { GoogleCloudSkuStat } from "../types.ts";

const Schema = mongoose.Schema;

const GoogleCloudPriceStatSchema = new Schema({
  dateCode: { type: String, required: true },
  skuId: { type: String, required: true },
  description: { type: String, required: true },
  serviceRegion: { type: String, required: true },
  serviceDisplayName: { type: String, required: true },
  resourceFamily: { type: String, required: true },
  resourceGroup: String,
  usageType: String,
  geoTaxonomy: String,
  virtualMachineType: String,
  price: { type: Number, required: true },
}, { timestamps: true });

/** create an index for that can be unique */
GoogleCloudPriceStatSchema.index({ dateCode: 1, skuId: 1 }, { unique: true });

export type GoogleCloudPriceStatModelType = mongoose.Document & Omit<GoogleCloudSkuStat, "id">;
export default mongoose.model<GoogleCloudPriceStatModelType>("GoogleCloudPriceStat", GoogleCloudPriceStatSchema);
