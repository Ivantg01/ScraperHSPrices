/** Schema and model for OracleCloudPrice */
import mongoose from "mongoose";
import { OracleCloudSkuFlat } from "../types.ts";

const Schema = mongoose.Schema;

const OracleCloudPriceSchema = new Schema({
  searchCode: { type: String, sparse: true }, /** internal own code to facilite searching */
  partNumber: { type: String, required: true, unique: true },
  displayName: { type: String, required: true },
  metricName: { type: String, required: true },
  serviceCategory: { type: String, required: true },
  currencyCode: { type: String, required: true },
  model: { type: String, required: true },
  value: { type: Number, required: true },
  rangeMin: { type: Number },
  rangeMax: { type: Number },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

/** create an index for searchCode that can be null and can be repeated */
OracleCloudPriceSchema.index({ searchCode: 1 }, { unique: false, sparse: true });

export type OracleCloudPriceModelType = mongoose.Document & Omit<OracleCloudSkuFlat, "id">;
export default mongoose.model<OracleCloudPriceModelType>("OracleCloudPrice", OracleCloudPriceSchema);
