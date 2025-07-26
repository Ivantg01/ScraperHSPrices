/** Schema and model for AzureCloudServices */
import mongoose from "mongoose";
import { GoogleCloudService } from "../types.ts";

const Schema = mongoose.Schema;

const GoogleCloudServiceSchema = new Schema({
  name: { type: String, sparse: true, unique: true },
  serviceId: { type: String, required: true },
  displayName: { type: String, required: true },
  active: { type: Boolean, required: true },
}, { timestamps: true });

export type GoogleCloudServiceModelType = mongoose.Document & Omit<GoogleCloudService, "id">;
export default mongoose.model<GoogleCloudServiceModelType>("GoogleCloudService", GoogleCloudServiceSchema);
