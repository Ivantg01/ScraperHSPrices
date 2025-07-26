/** Schema and model for AmazonCloudRegions */
import mongoose from "mongoose";
import { AmazonCloudRegion } from "../types.ts";

const Schema = mongoose.Schema;

const AmazonCloudRegionSchema = new Schema({
  name: { type: String, sparse: true, unique: true },
  displayName: { type: String, required: true },
  regionalDisplayName: { type: String, required: true },
  regionalName: { type: String, required: true },
  active: { type: Boolean, required: true },
}, { timestamps: true });

export type AmazonCloudRegionModelType = mongoose.Document & Omit<AmazonCloudRegion, "id">;
export default mongoose.model<AmazonCloudRegionModelType>("AmazonCloudRegion", AmazonCloudRegionSchema);
