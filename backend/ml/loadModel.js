const tf = require('@tensorflow/tfjs');
const fs = require('fs');
const path = require('path');
const { preprocessImage } = require('./preprocess');
const { IDX_TO_DISEASE, bananaDiseaseIdxs, riceDiseaseIdxs } = require('./diseaseMap');

let model = null;

/**
 * Custom IOHandler for loading TFJS models from the filesystem in Node.js
 * without requiring the native tfjs-node bindings.
 */
class NodeJSFileSystemHandler {
  constructor(modelJsonPath) {
    this.modelJsonPath = path.resolve(modelJsonPath);
    this.baseDir = path.dirname(this.modelJsonPath);
  }

  async load() {
    const modelJson = JSON.parse(fs.readFileSync(this.modelJsonPath, 'utf8'));
    const modelTopology = modelJson.modelTopology;
    const weightsManifest = modelJson.weightsManifest;

    const weightData = [];
    for (const group of weightsManifest) {
      for (const shardPath of group.paths) {
        const fullShardPath = path.join(this.baseDir, shardPath);
        const buffer = fs.readFileSync(fullShardPath);
        weightData.push(new Uint8Array(buffer));
      }
    }

    // Concatenate all weight shards
    const totalLength = weightData.reduce((acc, curr) => acc + curr.length, 0);
    const mergedWeights = new Uint8Array(totalLength);
    let offset = 0;
    for (const data of weightData) {
      mergedWeights.set(data, offset);
      offset += data.length;
    }

    return {
      modelTopology,
      weightSpecs: weightsManifest.flatMap(g => g.weights),
      weightData: mergedWeights.buffer
    };
  }
}

async function loadModel() {
  if (model) return model;

  const modelJsonPath = path.join(__dirname, 'model/model.json');

  try {
    const handler = new NodeJSFileSystemHandler(modelJsonPath);
    model = await tf.loadGraphModel(handler);
    console.log('✅ TFJS model loaded (Pure JS Mode)');
    return model;
  } catch (err) {
    console.error('❌ Failed to load model in Pure JS mode:', err);
    throw err;
  }
}

async function predictDisease(buffer) {
  let input, jsmodel, output, cropPred, diseasePred;
  try {
    jsmodel = await loadModel();
    input = await preprocessImage(buffer);

    output = jsmodel.execute(input, ["Identity:0", "Identity_1:0"]);
    cropPred = output[0];
    diseasePred = output[1];

    const cropData = await cropPred.data();
    const diseaseData = await diseasePred.data();

    const cropIdx = cropData.indexOf(Math.max(...cropData));
    const crop = cropIdx === 0 ? "Banana" : "Rice";

    const diseaseIdxs = crop === "Banana" ? bananaDiseaseIdxs : riceDiseaseIdxs;

    let maxProb = -1;
    let bestDiseaseIdx = -1;

    for (const idx of diseaseIdxs) {
      if (diseaseData[idx] > maxProb) {
        maxProb = diseaseData[idx];
        bestDiseaseIdx = idx;
      }
    }

    const diseaseRaw = IDX_TO_DISEASE[bestDiseaseIdx];
    const diseaseParts = diseaseRaw.split('_').slice(1);
    const diseaseName = diseaseParts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');

    return {
      crop: crop,
      disease: diseaseName,
      confidence: `${Math.round(maxProb * 100)}%`,
      probValue: maxProb,
      predictionString: `${crop} ${diseaseName}`
    };

  } finally {
    if (input && input.dispose) input.dispose();
    if (cropPred && cropPred.dispose) cropPred.dispose();
    if (diseasePred && diseasePred.dispose) diseasePred.dispose();
    if (output && Array.isArray(output)) {
      output.forEach(o => {
        if (o && o.dispose) o.dispose();
      });
    }
  }
}

module.exports = { loadModel, predictDisease };