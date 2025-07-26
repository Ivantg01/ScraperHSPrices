/** Schema and model for GoogleCloudPrice */
import mongoose from "mongoose";
import { GoogleCloudSkuFlat } from "../types.ts";

const Schema = mongoose.Schema;

const GoogleCloudPriceSchema = new Schema({
  searchCode: { type: String, sparse: true }, /** internal own code to facilite searching */
  serviceId: { type: String, required: true },
  skuId: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  serviceDisplayName: { type: String, required: true },
  resourceFamily: { type: String, required: true },
  resourceGroup: { type: String, required: true },
  usageType: { type: String, required: true },
  serviceRegion: { type: String, required: true },
  usageUnit: { type: String, required: true },
  displayQuantity: { type: Number, required: true },
  startUsageAmount: { type: Number, required: true },
  price: { type: Number, required: true },
  currencyCode: { type: String, required: true },
  usageUnitDescription: { type: String, required: true },
  baseUnit: { type: String, required: true },
  baseUnitDescription: { type: String, required: true },
  baseUnitConversionFactor: { type: Number, required: true },
  geoTaxonomyType: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

/** index for serviceId and skuId */
//GoogleCloudPriceSchema.index({ serviceId: 1, skuId: 1 }, { unique: true });
/** create an index for searchCode that can be null and can be repeated */
GoogleCloudPriceSchema.index({ searchCode: 1 }, { unique: false, sparse: true });

export type GoogleCloudPriceModelType = mongoose.Document & Omit<GoogleCloudSkuFlat, "id">;
export default mongoose.model<GoogleCloudPriceModelType>("GoogleCloudPrice", GoogleCloudPriceSchema);
