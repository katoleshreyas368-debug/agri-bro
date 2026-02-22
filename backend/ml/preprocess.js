const tf = require('@tensorflow/tfjs');
const { Jimp } = require('jimp');

/**
 * Preprocess image buffer using Jimp and pure TFJS
 * Avoids dependency on tfjs-node's native decodeImage
 */
async function preprocessImage(buffer) {
  // Read image using Jimp
  const image = await Jimp.read(buffer);

  // Resize to 224x224 (as required by the model)
  image.resize(224, 224);

  // Get image data as a buffer
  const { data, width, height } = image.bitmap; // RGBA buffer

  return tf.tidy(() => {
    // Convert RGBA to RGB tensor
    // Jimp gives us a Uint8Array [R, G, B, A, R, G, B, A, ...]
    const imgTensor = tf.tensor3d(new Uint8Array(data), [height, width, 4]);

    // Slice to get only RGB
    const rgbTensor = imgTensor.slice([0, 0, 0], [-1, -1, 3]);

    // Expand dims to match batch shape [1, 224, 224, 3]
    const expanded = rgbTensor.expandDims(0);

    // Normalize to [0, 1]
    return expanded.cast('float32').div(255.0);
  });
}

module.exports = { preprocessImage };