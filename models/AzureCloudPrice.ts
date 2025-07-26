import mongoose from "mongoose";
import { AzureCloudSkuFlat } from "../types.ts";

const Schema = mongoose.Schema;

const AzureCloudPriceSchema = new Schema({
  searchCode: { type: String, sparse: true }, /** internal own code to facilite searching */
  currencyCode: { type: String, required: true },
  tierMinimumUnits: { type: Number, required: true },
  reservationTerm: { type: String, required: false },
  price: { type: Number, required: true },
  armRegionName: { type: String, required: true },
  location: { type: String, required: true },
  effectiveStartDate: { type: Date, required: true },
  meterId: { type: String, required: true },
  meterName: { type: String, required: true },
  productId: { type: String, required: true },
  skuId: { type: String, required: true, unique: true },
  productName: { type: String, required: true },
  skuName: { type: String, required: true },
  serviceName: { type: String, required: true },
  serviceId: { type: String, required: true },
  serviceFamily: { type: String, required: true },
  unitOfMeasure: { type: String, required: true },
  type: { type: String, required: true },
  isPrimaryMeterRegion: { type: Boolean, required: true },
  armSkuName: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

/** index for serviceId and productId */
//GoogleCloudPriceSchema.index({ serviceId: 1, productId: 1 }, { unique: true });
/** create an index for searchCode that can be null and can be repeated */
AzureCloudPriceSchema.index({ searchCode: 1 }, { unique: false, sparse: true });

export type AzureCloudPriceModelType = mongoose.Document & Omit<AzureCloudSkuFlat, "id">;
export default mongoose.model<AzureCloudPriceModelType>("AzureCloudPrice", AzureCloudPriceSchema);
