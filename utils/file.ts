import { ensureFile } from "@std/fs";
import * as log from "@std/log";

/** store an array of JSON data in a file */
export async function saveJsonDataToFile<T>(
  data: T[],
  filename: string,
): Promise<void> {
  try {
    await ensureFile(filename);
    await Deno.writeTextFile(filename, JSON.stringify(data, null, 2));
    log.debug(`Data saved to ${filename}`);
  } catch (error) {
    log.error("Error saving data to file: " + error);
  }
}

/** store data into a file */
export async function saveTextDataToFile(
  data: string,
  filename: string,
): Promise<void> {
  try {
    await Deno.writeTextFile(filename, data);
    log.debug(`Data saved to ${filename}`);
  } catch (error) {
    log.error("Error saving data to file: " + error);
  }
}
