import * as fs from "fs";
import * as path from "path";
import csvParser from "csv-parser";
import { Chroma } from "langchain/vectorstores/chroma";
import { Document } from "langchain/document";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";

let numDimensions: number;

// Replace this with the path to your CSV directory
// const csvDirectory = "./csv-files/";
const csvDirectory = "assets/embeddings/EnergizerAI";

// Read all CSV files in the directory and load them into the Chroma database
const loadCSVFiles = async () => {
  try {
    fs.readdir(csvDirectory, async (err, files) => {
      if (err) {
        console.error(err);
        return;
      }

      const docs: Document[] = [];
      const vectors: number[][] = [];
      for (const file of files) {
        if (path.extname(file) === ".csv") {
          const fileDocs: Document[] = await new Promise((resolve, reject) => {
            const fileDocs: Document[] = [];
            const [name, year, domain_temp] = file.split("-");
            const domain = domain_temp.split(".")[0];
            const category =
              name.charAt(name.length - 1) === "g"
                ? "law"
                : name.charAt(name.length - 1) === "v"
                ? "ordinance"
                : undefined;
            console.info(name, category, year, domain);
            if (!category)
              console.warn(
                "WARN: NO CATEGORY for:",
                name,
                category,
                year,
                domain
              );
            fs.createReadStream(path.join(csvDirectory, file))
              .pipe(csvParser())
              .on("data", (row: any, rowIndex: number) => {
                if (rowIndex === 0) {
                  // This is the header row, skip it
                  return;
                }
                // Extract the text and vector representation from the CSV row
                const text = row["text"];
                let vectorRepresentation = row["vector"]
                  .split(",")
                  .map((value: string, index: number) => parseFloat(value));
                vectorRepresentation = vectorRepresentation.slice(1, vectorRepresentation.length)
                if (!numDimensions) {
                  numDimensions = vectorRepresentation.length;
                }

                vectors.push(vectorRepresentation);
                // Add the document to the fileDocs array
                fileDocs.push(
                  new Document({
                    pageContent: text,
                    metadata: {
                      // vectors: vectorRepresentation,
                      domain,
                      category,
                      reference: file,
                      versionTag: "latest",
                      year: "2022",
                    },
                  })
                );
              })
              .on("end", () => {
                console.log(`Finished processing ${file}`);
                resolve(fileDocs);
              })
              .on("error", (error) => {
                reject(error);
              });
          });

          docs.push(...fileDocs);
        }
      }

      try {
        const chromaInstance = new Chroma(
          new OpenAIEmbeddings({
            openAIApiKey: process.env.OPENAI_API_KEY,
          }),
          {
            url: "http://localhost:8000", // The database URL you're connecting to
            collectionName: "energizer", // The name of the collection you're working with
            numDimensions,
          }
        );
        await chromaInstance.ensureCollection();
        // console.log("vector", vectors[0]);
        console.log("vectors 0: ", vectors[0]);
        console.log("doc", docs[0]);
        console.log("vectors length", vectors.length);
        console.log("docs length", docs.length);
        console.log("vectors 0 - 1. value: ", vectors[0][0]);
        console.log("vectors 0 - 2. value: ", vectors[0][1]);
        console.log("vectors 0 - LAST value", vectors[0][numDimensions-1]);
        // console.log("vectors type", Array.isArray(vectors[0]));
        const result = await chromaInstance.addVectors(vectors, docs);

        console.log("Documents loaded into Chroma database");
      } catch (error) {
        console.error("Failed to load documents into Chroma database", error);
      }
    });
  } catch (err) {
    console.error(err);
  }
};

loadCSVFiles();
