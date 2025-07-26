import * as log from "@std/log";

/** fetch version with retry from https://dev.to/ycmjason/javascript-fetch-retry-upon-failure-3p6g*/
export const fetchWithRetry = async (url: string, n = 4) => {
  for (let i = 0; i < n; i++) {
    try {
      return await fetch(url, { signal: AbortSignal.timeout(10000 * n) });
    } catch (error) {
      log.error(`Error in fetch-${i + 1}: ${error}`);
    }
  }
  throw new Error(`fetchWithRetry failed ${n} times`);
};

/** handle errors in fetchWithRetry from https://stackoverflow.com/questions/47015693/how-to-fix-throw-of-exception-caught-locally */
export const handleFetchWithRetry = async (url: string) => {
  try {
    const response = await fetchWithRetry(url);
    if (!response.ok) {
      return Promise.reject(`HTTP error! Status: ${response.status}`);
    }
    return response;
  } catch (error) {
    throw error;
  }
};

/** fetch an url and save it to a file using pipeTo to avoid memory consumption with big files */
export async function fetchToFile(url: string, filename: string) {
  const res = await fetch(url);
  if (!res.body) {
    throw new Error("fetchToFile error body is empty");
  }
  const file = await Deno.open(filename, { create: true, write: true, truncate: true });
  try {
    await res.body.pipeTo(file.writable);
    log.debug(`-${url} -> ${filename} downloaded`);
  } catch (error) {
    await Deno.remove(filename);
    throw new Error(`fetchToFile error: ${error}`);
  } finally {
    try {
      file.close();
    } catch (_) { /* ignore if file was closed */ }
  }
}

/* Tests
export async function fetchWithRetry1(url: string, n = 3): Promise<Response> {
  const retriesLeft = n - 1;
  let attempts = 1;
  if (retriesLeft == 0) return Promise.reject("Too many attempts without answer");
  return await fetch(url).catch(function (error) {
    if (n !== 0) {
      setTimeout(() => {
        attempts++;
        fetchWithRetry1(url, n - 1);
      }, attempts * 5000);
    }
    return error;
  });
}*/
