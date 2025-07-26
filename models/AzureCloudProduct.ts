/** Schema and model for AzureCloudProducts */
import mongoose from "mongoose";
import { AzureCloudProduct } from "../types.ts";

const Schema = mongoose.Schema;

const AzureCloudProductSchema = new Schema({
  productName: { type: String, sparse: true },
  productId: { type: String, required: true, unique: true },
  serviceName: { type: String, required: true },
  serviceId: { type: String, required: true },
  active: { type: Boolean, required: true },
}, { timestamps: true });

export type AzureCloudProductModelType = mongoose.Document & Omit<AzureCloudProduct, "id">;
export default mongoose.model<AzureCloudProductModelType>("AzureCloudProduct", AzureCloudProductSchema);
