require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const fs = require("fs");
const path = require("path");
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.mjs");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const { getCollection } = require("./vectorStore");
const { getEmbedding } = require("./embeddings");

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

// Extract all text from a PDF file using pdfjs-dist
async function extractTextFromPDF(filePath) {
    const data = new Uint8Array(fs.readFileSync(filePath));
    const doc = await pdfjsLib.getDocument({ data }).promise;
    let fullText = "";

    for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map(item => item.str).join(" ");
        fullText += pageText + "\n";
    }

    return { text: fullText, numpages: doc.numPages };
}

async function ingest() {
    try {
        const collection = await getCollection();
        const dataFolderPath = path.join(__dirname, "data");
        const files = fs.readdirSync(dataFolderPath).filter(file => file.endsWith(".pdf"));

        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        });

        for (const fileName of files) {
            console.log(`\n📖 Reading: ${fileName}...`);
            const filePath = path.join(dataFolderPath, fileName);

            const data = await extractTextFromPDF(filePath);

            console.log(`📄 Extracted ${data.numpages} pages.`);
            const chunks = await splitter.splitText(data.text);
            console.log(`🧩 Created ${chunks.length} chunks. Starting upload...`);

            for (let i = 0; i < chunks.length; i++) {
                try {
                    const embedding = await getEmbedding(chunks[i]);

                    await collection.add({
                        ids: [`${fileName}_${i}`],
                        documents: [chunks[i]],
                        embeddings: [embedding],
                        metadatas: [{ source: fileName, chunkIndex: i }]
                    });

                    if (i % 10 === 0) {
                        process.stdout.write(`\r🚀 Progress: ${i}/${chunks.length} chunks`);
                    }

                    // Respect Google's Rate Limits (004 model is roughly 1500 RPM)
                    await sleep(100);
                } catch (err) {
                    console.error(`\n⚠️ Failed chunk ${i}:`, err.message);
                    // If you hit a rate limit, wait longer
                    if (err.message.includes("429")) await sleep(5000);
                }
            }
            console.log(`\n✅ Finished: ${fileName}`);
        }
    } catch (error) {
        console.error("❌ Ingestion Error:", error);
    }
}

ingest();