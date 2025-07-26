/** Schema and model for AzureCloudRegions */
import mongoose from "mongoose";
import { AzureCloudRegion } from "../types.ts";

const Schema = mongoose.Schema;

const AzureCloudRegionSchema = new Schema({
  name: { type: String, sparse: true, unique: true },
  displayName: { type: String, required: true },
  regionalDisplayName: { type: String, required: true },
  regionalName: { type: String, required: true },
  active: { type: Boolean, required: true },
}, { timestamps: true });

export type AzureCloudRegionModelType = mongoose.Document & Omit<AzureCloudRegion, "id">;
export default mongoose.model<AzureCloudRegionModelType>("AzureCloudRegion", AzureCloudRegionSchema);
