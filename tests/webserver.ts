import express, { Request, Response } from "express";
import * as log from "@std/log";
import * as path from "jsr:@std/path";

//function to start web simulator to scrape data from local web server
function startWebSimulator(hostname: string, port: number) {
  const app = express();
  app.use(express.json()); //enable json parsing

  //route definition
  app.listen(port, hostname, () => {
    log.info(`Server started on ${hostname}:${port}`);
  });

  app
    .get("/", (_req: Request, res: Response) => {
      res.send("Hello World!");
    })
    .get("/v1/services/:id/skus", getGoogleCloudSkus)
    .get("/api/retail/prices", getAzureCloudSkus)
    .get("/pls/apex/cetools/api/v1/products", getOracleCloudSkus)
    .get("/offers/v1.0/aws/:id/current/index.csv", getAmazonCloudSkus)
    .get("/offers/v1.0/aws/:id/current/:region/index.csv", getAmazonCloudSkus);
}

/** return Amazon Cloud simulated data just for 4 services including pagination */
const getAmazonCloudSkus = async (req: Request, res: Response) => {
  try {
    const serviceId = req.params.id || "";
    const region = req.params.region || "";
    const file = (region !== "")
      ? path.join(Deno.cwd(), "tests", "static", "AWS", `${serviceId}_${region}.csv`)
      : path.join(Deno.cwd(), "tests", "static", "AWS", `${serviceId}.csv`);
    log.debug("-Fetching AmazonCloud SKUs: " + file);

    //return the file content as text, considering it can be a big file
    const fileStream = await Deno.open(file, { read: true });
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="index.csv"`);

    //Writable stream to write the file content to the response
    const writableStream = new WritableStream({
      write: (chunk) => res.write(chunk),
      close: () => res.end(),
      abort: (err) => res.status(500).send(err.message),
    });

    // Pipe with the transform to the writeable stream
    await fileStream.readable
      .pipeThrough(
        new TransformStream({
          transform(chunk, controller) {
            controller.enqueue(chunk); // Asegurar Uint8Array
          },
        }),
      )
      .pipeTo(writableStream);
  } catch (error) {
    log.error("Error fetching AmazonCloud SKUs: " + error);
    if (error instanceof Deno.errors.NotFound) {
      res.status(404).send("Error fetching AmazonCloud SKUs not found");
    } else {
      res.status(500).send("Error fetching AmazonCloud SKUs");
    }
  }
};

/** return Google Cloud simulated data just for 4 services including pagination */
const getGoogleCloudSkus = (req: Request, res: Response) => {
  try {
    const serviceId = req.params.id || "";
    const pageToken = req.query.pageToken || "";
    const file = selectGoogleCloudFile(serviceId, pageToken);
    if (file === "") {
      res.status(404).send("Service not found");
      return;
    }
    const text = Deno.readTextFileSync(file);
    res.status(200).json(JSON.parse(text));
  } catch (error) {
    log.error("Error fetching GoogleCloud SKUs: " + error);
    res.status(500).send("Error fetching GoogleCloud SKUs");
  }
};

/** select GoogleCloud local file based on serviceId and pageToken */
function selectGoogleCloudFile(serviceId: string, pageToken: string): string {
  let file = "";
  if (serviceId === "6F81-5844-456A") { //compute engine
    if (pageToken === "") {
      file = path.join(Deno.cwd(), "/tests/static/GCP/6F81-5844-456A_skus0.json");
    } else if (
      pageToken ===
        "AHwBxFwpWs2MNGsly9mHXrydlK5dE-k6i9ikWBK4tIii7rnmp6DvS_bITgLMIwDVHQ9OcMjLNyfVZxCW9fdaIYdR_ZmKttunGeRJW6NozsDtKOgsL8baVIw="
    ) {
      file = path.join(Deno.cwd(), "/tests/static/GCP/6F81-5844-456A_skus1.json");
    } else if (
      pageToken ===
        "AHwBxFwJw3tU9xQj8z9Ov8W1aQk3ti2upRrZmhk45MWewTzA_NcCOWA6fcv69Xw2zWtXoZESgfdbfx-5-fbPi3tmw1aArqx8f08hzljTQZhA3rEJ-7XeRKI="
    ) {
      file = path.join(Deno.cwd(), "/tests/static/GCP/6F81-5844-456A_skus2.json");
    } else if (
      pageToken ===
        "AHwBxFyFkwnCWaMPA-AfyeKxfXSYfHK7r-pfkfsJGjGGPvA4-kaBhf7HggJr-yDv83thMrM5muqFm3SaVHj4UJ04v3K-nAkKIMtrYNrLWaHL3tOsq0brHdU="
    ) {
      file = path.join(Deno.cwd(), "/tests/static/GCP/6F81-5844-456A_skus3.json");
    } else {
      file = path.join(Deno.cwd(), "/tests/static/GCP/6F81-5844-456A_skus4.json");
    }
  } else if (serviceId === "95FF-2EF5-5EA1") { //cloud storage
    file = path.join(Deno.cwd(), "/tests/static/GCP/95FF-2EF5-5EA1_skus0.json");
  } else if (serviceId === "9662-B51E-5089") { //cloud sql
    if (pageToken === "") {
      file = path.join(Deno.cwd(), "/tests/static/GCP/9662-B51E-5089_skus0.json");
    } else if (
      pageToken ===
        "AHwBxFx8-9OOOBpNizjBlhR2NDAtbY3lyOU8CwaTwe3YzwbIpvuE1rmkzP5oV4fzl85PkfFu9-Ol_tSIYcyCN393QBFtZxffSH_0KBrCAew7hcBfSz9Xwco="
    ) {
      file = path.join(Deno.cwd(), "/tests/static/GCP/9662-B51E-5089_skus1.json");
    } else {
      file = path.join(Deno.cwd(), "/tests/static/GCP/9662-B51E-5089_skus2.json");
    }
  } else if (serviceId === "CCD8-9BF1-090E") { //GKE
    file = path.join(Deno.cwd(), "/tests/static/GCP/CCD8-9BF1-090E_skus0.json");
  }
  return file;
}

/** return Google Cloud simulated data just for 4 services including pagination */
function getAzureCloudSkus(req: Request, res: Response) {
  try {
    const url = req.url || "";
    const file = selectAzureCloudFile(url);
    if (file === "") {
      res.status(404).send("Service not found");
      return;
    }
    const text = Deno.readTextFileSync(file);
    res.status(200).json(JSON.parse(text));
  } catch (error) {
    log.error("Error fetching AzureCloud SKUs: " + error);
    res.status(500).send("Error fetching AzureCloud SKUs");
  }
}

/** Locate the file equivalent to the original path in Azure Cloud on the local server  */
function selectAzureCloudFile(url: string): string {
  //files are stored in tests/static/AZR folder with the name of the filter
  //ej url="https://prices.azure.com/api/retail/prices?$filter=productId%20eq%20%27DZH318Z0BP04%27"
  const file = path.join(Deno.cwd(), "tests", "static", "AZR", `${url.split("filter=")[1]}.json`);
  return (Deno.statSync(file)) ? file : "";
}

function getOracleCloudSkus(_req: Request, res: Response) {
  try {
    const file = path.join(Deno.cwd(), "tests", "static", "OCI", "products.json");
    const text = Deno.readTextFileSync(file);
    res.status(200).json(JSON.parse(text));
  } catch (error) {
    log.error("Error fetching OracleCloud SKUs: " + error);
    res.status(500).send("Error fetching OracleCloud SKUs");
  }
}

export { startWebSimulator };
