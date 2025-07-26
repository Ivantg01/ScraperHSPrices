/** Schema and model for AzureCloudServices */
import mongoose from "mongoose";
import { AmazonCloudService } from "../types.ts";

const Schema = mongoose.Schema;

const AmazonCloudServiceSchema = new Schema({
  name: { type: String, sparse: true, unique: true },
  serviceId: { type: String, required: true },
  displayName: { type: String, required: true },
  active: { type: Boolean, required: true },
  scrapePerRegion: { type: Boolean, required: true },
}, { timestamps: true });

export type AmazonCloudServiceModelType = mongoose.Document & Omit<AmazonCloudService, "id">;
export default mongoose.model<AmazonCloudServiceModelType>("AmazonCloudService", AmazonCloudServiceSchema);
