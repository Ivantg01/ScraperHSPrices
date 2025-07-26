import { parse } from "@std/csv/parse";
import { TextLineStream } from "@std/streams/text-line-stream";

async function processLargeFile(filename: string, batchSize = 1000) {
  try {
    const file = await Deno.open(filename, { read: true });
    let chunks: string[] = [];
    let headerFound = false;
    let lineCounter = 0;
    const lines = file.readable
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(new TextLineStream());

    // Un solo bucle para todo el procesamiento
    for await (const line of lines) {
      if (!headerFound) {
        if (line.startsWith('"SKU"')) {
          chunks.push(line);
          headerFound = true;
        }
        continue;
      }
      chunks.push(line);
      lineCounter++;

      if (lineCounter % batchSize === 0) {
        doOperation(chunks.join("\n"));
        chunks = headerFound ? [chunks[0]] : [];
      }
    }
    // Procesar restantes
    if (chunks.length > 0) {
      doOperation(chunks.join("\n"));
    }
  } catch (e) {
    console.error("error: " + e);
  }
}

function doOperation(batch: string) {
  try {
    const record = parse(batch, { skipFirstRow: true, fieldsPerRecord: 0 });

    // Implementar lógica de procesamiento aquí
    console.log(`Procesando lote de ${record.length} líneas`);
    //visualiza el contenido de batch
    for (const sku of record) {
      console.log(`--elemento: ${sku.SKU} 
    serviceCode=${sku.serviceCode}
    regionCode=${sku["Region Code"] || sku["From Region Code"]}
    termType=${sku.TermType}
    LeaseContractLength?=${sku.LeaseContractLength || ""}
    purchaseOption?=${sku.PurchaseOption || ""}
    offeringClass?=${sku.OfferingClass || ""}
    priceDescription=${sku.PriceDescription}
    startingRange?=${sku.StartingRange || ""}
    endingRange?=${sku.EndingRange || ""}
    unit=${sku.Unit}
    price=${sku.PricePerUnit}
    currency=${sku.Currency}
    productFamily=${sku["Product Family"]}
    usageType=${sku.usageType}
    volumeType?=${sku.volumeType || ""}
    fromLocationType?=${sku["From Location Type"]}
    instanceType?=${sku["Instance Type"] || sku.InstanceType || ""}
    databaseEngine?=${sku["Database Engine"] || ""}
    `);
    }
  } catch (e) {
    console.error("Error in parse: " + e);
  }
}

await processLargeFile("datos.csv", 2);

console.log("fin");
