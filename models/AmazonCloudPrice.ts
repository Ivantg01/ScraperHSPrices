/** Schema and model for AmazonCloudPrice */
import mongoose from "mongoose";
import { AmazonCloudSkuFlat } from "../types.ts";

const Schema = mongoose.Schema;

const AmazonCloudPriceSchema = new Schema({
  searchCode: { type: String, sparse: true }, /** internal own code to facilite searching */
  rateCode: { type: String, required: true, index: true },
  serviceCode: { type: String, required: true, index: true },
  regionCode: { type: String, required: true, index: true },
  termType: { type: String, required: true },
  leaseContractLength: String,
  purchaseOption: String,
  offeringClass: String,
  priceDescription: { type: String, required: true },
  startingRange: String,
  endingRange: String,
  unit: { type: String, required: true },
  price: { type: Number, required: true },
  currency: { type: String, required: true },
  productFamily: { type: String, required: true },
  usageType: { type: String, required: true },
  volumeType: String,
  volumeApiName: String,
  storageMedia: String,
  fromLocationType: String,
  operation: String,
  tenancy: String,
  instanceType: String,
  databaseEngine: String,
  databaseEdition: String,
  deploymentOption: String,
  licenseModel: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

/** create an index for searchCode that can be null and can be repeated */
AmazonCloudPriceSchema.index({ searchCode: 1 }, { unique: false, sparse: true });

export type AmazonCloudPriceModelType = mongoose.Document & Omit<AmazonCloudSkuFlat, "id">;
export default mongoose.model<AmazonCloudPriceModelType>("AmazonCloudPrice", AmazonCloudPriceSchema);
