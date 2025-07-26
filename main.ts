import "@std/dotenv/load";
import { startLogger } from "./utils/logger.ts";
import { startWebSimulator } from "./tests/webserver.ts";
import { dbConnect } from "./utils/db.ts";
import { dbReadConfigData } from "./utils/db.ts";
import { scrapeGoogleCloudPrices } from "./GCP/services.ts";
import { scrapeAzureCloudPrices } from "./AZR/services.ts";
import { scrapeOracleCloudPrices } from "./OCI/services.ts";
import { scrapeAmazonCloudPrices } from "./AWS/services.ts";
import { processAmazonCloudStats } from "./AWS/stats.ts";
import { processGoogleCloudStats } from "./GCP/stats.ts";
import { processOracleCloudStats } from "./OCI/stats.ts";
import { processAzureCloudStats } from "./AZR/stats.ts";

startLogger();
if (Deno.env.get("WEBSIMULATOR_ENABLE") === "True") {
  const hostname = Deno.env.get("WEBSIMULATOR_HOST") || "localhost";
  const port = Number(Deno.env.get("WEBSIMULATOR_PORT") || "3000");
  startWebSimulator(hostname, port);
}
await dbConnect();
await dbReadConfigData();
await scrapeAmazonCloudPrices();
await scrapeAzureCloudPrices();
await scrapeGoogleCloudPrices();
await scrapeOracleCloudPrices();

await processAmazonCloudStats();
await processAzureCloudStats();
await processGoogleCloudStats();
await processOracleCloudStats();
