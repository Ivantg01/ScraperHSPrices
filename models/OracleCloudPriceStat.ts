/** Schema and model for OracleCloudPriceStat */
import mongoose from "mongoose";
import { OracleCloudSkuStat } from "../types.ts";

const Schema = mongoose.Schema;

const OracleCloudPriceStatSchema = new Schema({
  dateCode: { type: String, required: true },
  partNumber: { type: String, required: true },
  displayName: { type: String, required: true },
  metricName: { type: String, required: true },
  serviceCategory: { type: String, required: true },
  value: { type: Number, required: true },
}, { timestamps: true });

/** create an index for that can be unique */
OracleCloudPriceStatSchema.index({ dateCode: 1, partNumber: 1 }, { unique: true });

export type OracleCloudPriceStatModelType = mongoose.Document & Omit<OracleCloudSkuStat, "id">;
export default mongoose.model<OracleCloudPriceStatModelType>("OracleCloudPriceStat", OracleCloudPriceStatSchema);
