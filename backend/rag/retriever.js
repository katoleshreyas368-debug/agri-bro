// backend/rag/retriever.js
const lancedb = require("@lancedb/lancedb");
const path = require("path");
const { getEmbedding } = require("./embeddings"); // same model used during ingestion

let _table = null;

async function getTable() {
    if (_table) return _table;
    const db = await lancedb.connect(path.join(__dirname, "agri_data"));
    _table = await db.openTable("knowledge_base");
    return _table;
}

async function retrieveContext(query, topK = 4) {
    try {
        const [table, queryVector] = await Promise.all([
            getTable(),
            getEmbedding(query), // uses all-MiniLM-L6-v2, same as ingest
        ]);

        const results = await table
            .vectorSearch(queryVector)
            .limit(topK)
            .toArray();

        if (!results || results.length === 0) return "";

        return results
            .filter((r) => r.source !== "none") // skip the dummy init record
            .map((r) => r.text)
            .join("\n\n");
    } catch (err) {
        console.error("RAG retrieval error:", err.message);
        return ""; // fail gracefully — bot falls back to general knowledge
    }
}

module.exports = { retrieveContext };