import type { NextApiRequest, NextApiResponse } from "next";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { Chroma } from "langchain/vectorstores/chroma";
// import { makeChain } from "@/utils/makechain";
// import { pinecone } from "@/utils/pinecone-client";
// import { PINECONE_INDEX_NAME, PINECONE_NAME_SPACE } from "@/config/pinecone";
import { makeChain } from "@/lib/langchain/makechain";
import { transformChatGPTMessages } from "@/lib/helper/langchain";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { messages } = req.body;
  // console.log("messages: ", messages);
const history = transformChatGPTMessages(messages.slice(0, messages.length - 1))
  // const history = transformChatGPTMessages(
  //   messages.slice(0, messages.length - 1)
  // );
  const question = messages[messages.length - 1].content;
  // console.log("question: ", question);
  // console.log("history: ", history);
  // if (question) {
  if (!question) {
    return res.status(400).json({ message: "No question in the request" });
  }
  // OpenAI recommends replacing newlines with spaces for best results
  const sanitizedQuestion = question.trim().replaceAll("\n", " ");

  /* create vectorstore*/
  const vectorStore = await Chroma.fromExistingCollection(
    // new OpenAIEmbeddings(),
    new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY!,
    }),
    {
      collectionName: "energizer",
      url: "http://chromadb:8000",
    }
  );
  console.log(vectorStore, "vectorStore");

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });

  const sendData = (data: string) => {
    res.write(`data: ${data}\n\n`);
  };

  sendData(JSON.stringify({ data: "" }));

  //create chain
  const chain = makeChain(vectorStore, (token: string) => {
    sendData(JSON.stringify({ data: token }));
  });
  console.log(chain, "chain");
  // res.end();

  try {
    //Ask a question
    const response = await chain.call({
      question: sanitizedQuestion,
      chat_history: history || [],
    });

    console.log("response", response);
    sendData(JSON.stringify({ sourceDocs: response.sourceDocuments }));
  } catch (error) {
    console.log("error", error);
  } finally {
    sendData("[DONE]");
    res.end();
  }
}
