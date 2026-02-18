const lancedb = require("@lancedb/lancedb");
const path = require("path");

async function getCollection() {
    // Connect to a local folder named 'agri_data'
    const db = await lancedb.connect(path.join(__dirname, "agri_data"));

    // In LanceDB, 'collections' are called 'tables'
    // We try to open the table; if it doesn't exist, we create a placeholder
    let table;
    try {
        table = await db.openTable("knowledge_base");
    } catch (e) {
        // Create table with a dummy item to initialize the schema
        table = await db.createTable("knowledge_base", [
            { id: "init", vector: new Array(768).fill(0), text: "initialization", source: "none" }
        ]);
    }

    // Wrap LanceDB to work with your existing ingest script
    return {
        add: async ({ ids, documents, embeddings, metadatas }) => {
            const records = documents.map((doc, i) => ({
                id: ids[i],
                vector: embeddings[i],
                text: doc,
                source: metadatas[i].source
            }));
            await table.add(records);
        }
    };
}

module.exports = { getCollection };