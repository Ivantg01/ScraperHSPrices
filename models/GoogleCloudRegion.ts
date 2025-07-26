/** Schema and model for GoogleCloudRegions */
import mongoose from "mongoose";
import {GoogleCloudRegion} from "../types.ts";

const Schema = mongoose.Schema;

const GoogleCloudRegionSchema = new Schema({
  name: {type: String, sparse: true, unique: true},
  displayName: {type: String, required: true},
  regionalDisplayName: {type: String, required: true},
  regionalName: {type: String, required: true},
  active: {type: Boolean, required: true},
}, {timestamps: true});

export type GoogleCloudRegionModelType = mongoose.Document & Omit<GoogleCloudRegion, "id">;
export default mongoose.model<GoogleCloudRegionModelType>("GoogleCloudRegion", GoogleCloudRegionSchema);
