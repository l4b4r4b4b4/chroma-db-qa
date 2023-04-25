// pages/api/document/upload.ts (or .js)

import { NextApiRequest, NextApiResponse } from "next";
import formidable, { File } from "formidable";
import { CustomPDFLoader } from "@/lib/langchain/customPDFLoader";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings } from "langchain/embeddings";
import { Chroma } from "langchain/vectorstores";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { convertEmailAndName } from "@/lib/langchain/chroma";

const upload = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    res.status(403).json({ error: "Unauthorized" });
    return;
  }

  try {
    const { user } = session;
    console.log(user);
    const data = await parseFormData(req);
    const files = data.files;
    // Process the uploaded files (e.g., save them to a storage service or the filesystem)
    // ...
    const pdfFilePath = files[0].filepath;
    const fileName = files[0].newFilename;
    // console.log(files[0]);
    const loader = new CustomPDFLoader(pdfFilePath);

    const rawDoc = await loader.load();
    // console.log(files[0]);
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 100,
    });

    const doc = await textSplitter.splitDocuments(rawDoc);
    // console.log(doc[0]);
    // console.log(files[0]);
    const vectorStore = await Chroma.fromDocuments(
      doc,
      new OpenAIEmbeddings({
        openAIApiKey: process.env.OPENAI_API_KEY!,
      }),
      {
        collectionName: fileName,
        url: "http://chromadb:8000",
      }
    );
    res.status(200).json({ message: "Upload successful" });
  } catch (error) {
    console.error("Error in /api/document/upload:", error);
    res.status(500).json({ error: "Failed to upload files" });
  }
};

const parseFormData = (req: NextApiRequest) => {
  return new Promise<{ files: File[] }>((resolve, reject) => {
    const form = new formidable.IncomingForm();

    form.parse(req, (err, _fields, files) => {
      if (err) {
        reject(err);
        return;
      }

      // Ensure files.files is an array
      const uploadedFiles = Array.isArray(files.files)
        ? files.files
        : [files.files];
      resolve({ files: uploadedFiles });
    });
  });
};

export default upload;

export const config = {
  api: {
    bodyParser: false,
  },
};
