import * as log from "@std/log";
import "@std/dotenv/load";
import mongoose from "mongoose";
import {AmazonCloudRegion, AmazonCloudService} from "../types.ts";
import {amazonCloudDefaultRegions, amazonCloudDefaultServices} from "./dbDefaultContent.ts";
import AmazonCloudRegionModel from "../models/AmazonCloudRegion.ts";
import AmazonCloudServiceModel from "../models/AmazonCloudService.ts";

import {AzureCloudRegion, AzureCloudProduct} from "../types.ts";
import {azureCloudDefaultProducts, azureCloudDefaultRegions} from "./dbDefaultContent.ts";
import AzureCloudRegionModel from "../models/AzureCloudRegion.ts";
import AzureCloudProductModel from "../models/AzureCloudProduct.ts";

import {GoogleCloudRegion, GoogleCloudService} from "../types.ts";
import {googleCloudDefaultServices, googleCloudDefaultRegions} from "./dbDefaultContent.ts";
import GoogleCloudRegionModel from "../models/GoogleCloudRegion.ts";
import GoogleCloudServiceModel from "../models/GoogleCloudService.ts";

/** Connection to a mongoDB database using MONGO_URI env */
export async function dbConnect() {
  const uri = Deno.env.get("MONGO_URI");
  if (!uri) {
    log.error("MONGO_URI not found in environment variables.");
    return;
  }
  try {
    await mongoose.connect(uri);
    log.info(`Connected to MongoDB: ${uri}`);
  } catch (e) {
    log.error("Error connecting to MongoDB: " + e);
  }
}

/** Disconnect from the mongoDB database */
export async function dbDisconnect() {
  try {
    await mongoose.disconnect();
    log.info("Disconnected from MongoDB");
  } catch (error) {
    log.error("Error disconnecting from MongoDB: " + error);
  }
}

// Amazon Cloud types ======================================================================

/** Set AmazonCloud regions to the database */
export async function setAmazonCloudRegions() {
  try {
    await AmazonCloudRegionModel.collection.drop();
    const result = await AmazonCloudRegionModel.insertMany(amazonCloudDefaultRegions);
    log.info(`Amazon regions added to database: ${result.length}`);
  } catch (error) {
    log.error("Error adding Amazon regions to database: " + error);
  }
}

/** Get all AmazonCloud regions from the database */
export async function getAmazonCloudRegions(): Promise<AmazonCloudRegion[]> {
  try {
    const regions = await AmazonCloudRegionModel.find();
    log.info(`Amazon regions read from database: ${regions.length}`);
    return regions;
  } catch (error) {
    log.error("Error reading Amazon regions from database: " + error);
    throw error;
  }
}

/** Set AmazonCloud services to the database */
export async function setAmazonCloudServices() {
  try {
    await AmazonCloudServiceModel.collection.drop();
    const result = await AmazonCloudServiceModel.insertMany(amazonCloudDefaultServices);
    log.info(`Amazon services added to database: ${result.length}`);
  } catch (error) {
    log.error("Error adding Amazon services to database: " + error);
  }
}

/** Get all AmazonCloud services from the database */
export async function getAmazonCloudServices(): Promise<AmazonCloudService[]> {
  try {
    const services = await AmazonCloudServiceModel.find();
    log.info(`Amazon services read from database: ${services.length}`);
    return services;
  } catch (error) {
    log.error("Error reading Amazon services from database: " + error);
    throw error;
  }
}

// Azure Cloud types ======================================================================

/** Set AzureCloud regions to the database */
export async function setAzureCloudRegions() {
  try {
    await AzureCloudRegionModel.collection.drop();
    const result = await AzureCloudRegionModel.insertMany(azureCloudDefaultRegions);
    log.info(`Azure regions added to database: ${result.length}`);
  } catch (error) {
    log.error("Error adding Azure regions to database: " + error);
  }
}

/** Get all AzureCloud regions from the database */
export async function getAzureCloudRegions(): Promise<AzureCloudRegion[]> {
  try {
    const regions = await AzureCloudRegionModel.find();
    log.info(`Azure regions read from database: ${regions.length}`);
    return regions;
  } catch (error) {
    log.error("Error reading Azure regions from database: " + error);
    throw error;
  }
}

/** Set AzureCloud products to the database  */
export async function setAzureCloudProducts() {
  try {
    await AzureCloudProductModel.collection.drop();
    const result = await AzureCloudProductModel.insertMany(azureCloudDefaultProducts);
    log.info(`Azure products added to database: ${result.length}`);
  } catch (error) {
    log.error("Error adding Azure products to database: " + error);
  }
}

/** Read all AzureCloud products from the database */
export async function getAzureCloudProducts(): Promise<AzureCloudProduct[]> {
  try {
    const products = await AzureCloudProductModel.find();
    log.info(`Azure products read from database: ${products.length}`);
    return products;
  } catch (error) {
    log.error("Error reading products from database: " + error);
    throw error;
  }
}

// Google Cloud types ======================================================================

/** Set GoogleCloud regions to the database */
export async function setGoogleCloudRegions() {
  try {
    await GoogleCloudRegionModel.collection.drop();
    const result = await GoogleCloudRegionModel.insertMany(googleCloudDefaultRegions);
    log.info(`Google regions added to database: ${result.length}`);
  } catch (error) {
    log.error("Error adding Google regions to database: " + error);
  }
}

/** Get all AmazonCloud regions from the database */
export async function getGoogleCloudRegions(): Promise<GoogleCloudRegion[]> {
  try {
    const regions = await GoogleCloudRegionModel.find();
    log.info(`Google regions read from database: ${regions.length}`);
    return regions;
  } catch (error) {
    log.error("Error reading Google regions from database: " + error);
    throw error;
  }
}

/** Set GoogleCloud services to the database */
export async function setGoogleCloudServices() {
  try {
    await GoogleCloudServiceModel.collection.drop();
    const result = await GoogleCloudServiceModel.insertMany(googleCloudDefaultServices);
    log.info(`Google services added to database: ${result.length}`);
  } catch (error) {
    log.error("Error adding Google services to database: " + error);
  }
}

/** Get all GoogleCloud services from the database */
export async function getGoogleCloudServices(): Promise<GoogleCloudService[]> {
  try {
    const services = await GoogleCloudServiceModel.find();
    log.info(`Google services read from database: ${services.length}`);
    return services;
  } catch (error) {
    log.error("Error reading Google services from database: " + error);
    throw error;
  }
}

/** Read all static data from the database */
export let amazonCloudServices: AmazonCloudService[] = [];
export let amazonCloudRegions: AzureCloudRegion[] = [];
export let azureCloudRegions: AzureCloudRegion[] = [];
export let azureCloudProducts: AzureCloudProduct[] = [];
export let googleCloudServices: GoogleCloudService[] = [];

export async function dbReadConfigData() {
  amazonCloudRegions = await getAmazonCloudRegions();
  amazonCloudServices = await getAmazonCloudServices();
  azureCloudRegions = await getAzureCloudRegions();
  azureCloudProducts = await getAzureCloudProducts();
  googleCloudServices = await getGoogleCloudServices();
}
