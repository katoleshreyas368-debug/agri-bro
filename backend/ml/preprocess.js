const tf = require('@tensorflow/tfjs');
const { Jimp } = require('jimp');

/**
 * Preprocess image buffer using Jimp (pure-JS fallback, no tfjs-node needed).
 *
 * Produces a [1, 224, 224, 3] float32 tensor with values in [0, 1],
 * matching EfficientNet training preprocessing.
 */
async function preprocessImage(buffer) {
  // Decode the image via Jimp and resize to model input size
  const image = await Jimp.read(buffer);
  image.resize({ w: 224, h: 224 });

  const { data, width, height } = image.bitmap; // Uint8Array: RGBA interleaved

  // Manually strip the alpha channel: [R,G,B,A,...] → [R,G,B,...]
  // This avoids any tensor slicing overhead and gives us exactly what
  // tf.node.decodeImage(buffer, 3) would produce.
  const rgbData = new Float32Array(width * height * 3);
  for (let i = 0, j = 0; i < data.length; i += 4, j += 3) {
    rgbData[j] = data[i] / 255.0; // R
    rgbData[j + 1] = data[i + 1] / 255.0; // G
    rgbData[j + 2] = data[i + 2] / 255.0; // B
    // Alpha channel (data[i+3]) is intentionally discarded
  }

  // Build the tensor directly from the pre-normalised Float32Array
  // Shape [1, 224, 224, 3] — batch dimension added inline
  return tf.tensor4d(rgbData, [1, height, width, 3]);
}

module.exports = { preprocessImage };