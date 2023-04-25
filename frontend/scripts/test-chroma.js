const { ChromaClient } = require("chromadb");
const client = new ChromaClient("http://localhost:8000");

async function deleteCollectionAndLog() {
  await client.deleteCollection("my_collection");
  console.log(client);
}
// deleteCollectionAndLog();
async function getCollectionAndLog() {
  const collection = await client.getCollection("energizer");
  await collection.peek(); // returns a list of the first 10 items in the collection
  await collection.count(); // returns the number of items in the collection
  console.log(await collection.peek());
  console.info(await collection.count());
}

getCollectionAndLog();
