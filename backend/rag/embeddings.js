const { pipeline } = require("@huggingface/transformers");

let extractor;

async function getEmbedding(text) {
    // Load the model only once
    if (!extractor) {
        extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    }

    // Generate embedding
    const output = await extractor(text, { pooling: 'mean', normalize: true });

    // Extract the raw array from the Tensor object
    return Array.from(output.data);
}

module.exports = { getEmbedding };