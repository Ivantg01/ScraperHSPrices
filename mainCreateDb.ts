import * as db from "./utils/db.ts";
import {startLogger} from "./utils/logger.ts";

startLogger();
await db.dbConnect();
await db.setAmazonCloudRegions();
await db.setAmazonCloudServices();
await db.setAzureCloudRegions();
await db.setAzureCloudProducts();
await db.setGoogleCloudRegions();
await db.setGoogleCloudServices();
await db.dbDisconnect();
