# 📸 AgriBot — Photo Upload Workflow

A complete technical walkthrough of what happens end-to-end when a user uploads a photo in the AgriBot chat.

---

## Overview

```
Image Upload
    ↓
Multer (memory buffer)
    ↓
preprocess.js → [1, 224, 224, 3] tensor
    ↓
TF.js model → crop head + disease headse
    ↓
diseaseMap.js → filter by crop → best disease
    ↓
Session stored → effectiveMessage built
    ↓
RAG retrieval (LanceDB)
    ↓
Gemini (system prompt + history + disease context)
    ↓
JSON response → Frontend display
```

---

## Stage 1 — Frontend Request (AIAdvisor.tsx)

The user selects or captures an image in the chat UI. The frontend packages it as a `multipart/form-data` POST request to `/chat` with the following fields:

| Field | Type | Description |
|-------|------|-------------|
| `image` | File | The leaf image (JPEG/PNG) |
| `message` | string | Optional accompanying text from the farmer |
| `sessionId` | string | Unique ID to track conversation history |
| `language` | string | `"english"`, `"hindi"`, or `"both"` (Hinglish) |

---

## Stage 2 — Route Entry & Multer Parsing (chat.js)

The POST request hits the `/chat` route defined in `routes/chat.js`.

**Multer middleware** intercepts the request:

```js
const upload = multer();
router.post("/", upload.single("image"), async (req, res) => { ... });
```

- The image is parsed **entirely in memory** — no disk write occurs.
- The raw binary is available as `req.file.buffer` (a Node.js `Buffer`).
- Text fields are available on `req.body`.

If neither a message nor an image is provided, a `400` error is returned immediately.

---

## Stage 3 — ML Prediction Pipeline

This is the core of the photo upload flow. It runs inside `predictDisease(imageFile.buffer)`.

### 3a. Model Loading — `loadModel.js`

```js
const model = await loadModel();
```

- Uses **TensorFlow.js** (`@tensorflow/tfjs-node`) to load a saved graph model from `model/model.json`.
- Implements a **singleton pattern** — the model is loaded once and cached in memory.
- At server startup (`index.js`), `loadModel()` is called proactively to **pre-warm** the model so the first real request is fast.

```js
// index.js — pre-warm at startup
const { loadModel } = require('../ml/loadModel');
loadModel().catch(err => console.error('Failed to preload ML model:', err.message));
```

### 3b. Image Preprocessing — `preprocess.js`

```js
const input = preprocessImage(imageBuffer);
```

The raw buffer goes through these steps inside a `tf.tidy()` block (which automatically disposes intermediate tensors to prevent memory leaks):

| Step | Operation | Output Shape |
|------|-----------|--------------|
| Decode | `tf.node.decodeImage(buffer, 3)` | `[H, W, 3]` |
| Resize | `tf.image.resizeBilinear(img, [224, 224])` | `[224, 224, 3]` |
| Expand | `.expandDims(0)` | `[1, 224, 224, 3]` |
| Normalize | `.div(255.0)` | `[1, 224, 224, 3]` — values in `[0, 1]` |

The `224×224` size and `[0, 1]` normalization match the **EfficientNet** input requirements that the model was trained with.

### 3c. Model Inference (chat.js)

The model has **two output heads**, executed together:

```js
const outputs = model.execute(input, ["Identity:0", "Identity_1:0"]);
const cropPred    = outputs[0]; // shape [-1, 2]  → banana vs rice
const diseasePred = outputs[1]; // shape [-1, 8]  → 8 disease classes
```

**Crop classification (Identity:0):**
- Runs `argMax(-1)` to get the winning crop index.
- `0 → banana`, `1 → rice`
- Also captures `cropConfidence` (the max probability).

**Disease classification (Identity_1:0):**
- Extracts the full probability array across all 8 disease classes.
- Does **not** blindly take the global argmax — it filters by crop first (see next step).

### 3d. Disease Mapping & Filtering — `diseaseMap.js`

```js
const { IDX_TO_DISEASE, bananaDiseaseIdxs, riceDiseaseIdxs } = require("../../ml/diseaseMap");
```

The disease head outputs probabilities for all 8 classes, but only 4 belong to each crop:

| Crop | Allowed Indices | Conditions |
|------|----------------|------------|
| Banana | `[0, 1, 2, 3]` | Cordana, Healthy, Pestalotiopsis, Sigatoka |
| Rice | `[4, 5, 6, 7]` | Bacterial Leaf Blight, Brown Spot, Healthy, Leaf Blast |

```js
const allowed = crop === "banana" ? bananaDiseaseIdxs : riceDiseaseIdxs;
let bestIdx = -1, bestScore = -Infinity;
for (const i of allowed) {
  if (diseaseProbs[i] > bestScore) { bestScore = diseaseProbs[i]; bestIdx = i; }
}
```

This prevents cross-crop misclassifications (e.g., a banana disease being predicted for a rice leaf).

The best index is mapped to a human-readable name:

```
"banana_cordana" → "Banana Cordana"
"rice_healthy"   → "Rice Healthy"
```

Finally, all intermediate tensors are disposed:
```js
tf.dispose([input, cropPred, diseasePred]);
```

---

## Stage 4 — Session Context Storage

The prediction result is saved to the in-memory session:

```js
session.detectedDisease = prediction;
```

This is crucial — it means **follow-up text messages** in the same conversation will still carry the disease context without the farmer needing to re-upload the image.

Sessions are keyed by `sessionId` and stored in a `Map`. Each session holds:
- `history` — conversation turns (trimmed to the last 10 pairs / 20 messages)
- `detectedDisease` — the most recent ML prediction

---

## Stage 5 — Effective Message Construction

An `effectiveMessage` string is built to communicate the ML result to Gemini:

**If plant is healthy:**
```
I uploaded a banana leaf image. Your ML model detected that the plant looks healthy
(Banana Healthy, confidence: 94.2%). Please confirm and give me tips to maintain healthy crops.
```

**If plant is diseased:**
```
I uploaded a banana leaf image. Your ML model detected: Banana Cordana (confidence: 87.6%).
Please tell me about this disease — causes, symptoms, treatment, and prevention.
```

If the farmer also typed a message alongside the image, it is appended:
```
... Additional context from farmer: <farmer's text here>
```

---

## Stage 6 — RAG Retrieval

```js
const ragContext = await retrieveContext(effectiveMessage);
```

The `effectiveMessage` is sent to `retriever.js` which queries **LanceDB** for semantically relevant chunks from the agricultural knowledge base. These chunks are injected into the Gemini system prompt under the `📚 KNOWLEDGE BASE` section to ground the response in accurate data.

---

## Stage 7 — Gemini Prompt Assembly & Response

A structured system prompt is built with these sections:

| Section | Content |
|---------|---------|
| 🌐 Language | Instruction to respond in English / Hindi / Hinglish |
| 🎯 Role | AgriBot persona — Indian farming advisor |
| 📚 Knowledge Base | RAG-retrieved context chunks |
| 🔬 Disease Diagnosis | Active disease from ML model (crop, condition, confidence, health status) |
| 💬 Conversation Flow | Rules about asking for location/crop, seasonal context |
| ✍️ Response Format | Mandatory heading + bullets + tip + note structure |
| 🚫 Out of Scope | Hard redirect for non-agriculture queries |

The model used is `gemini-flash-latest` with:
- `temperature: 0.1` (low randomness for consistent agricultural advice)
- `maxOutputTokens: 4000`

The existing session `history` is passed to `model.startChat({ history })` so Gemini has full conversational context.

The message is sent with **exponential backoff retry logic** for `503`/`429` API errors (up to 3 retries: 1s → 2s → 4s wait).

---

## Stage 8 — Response to Frontend

The final JSON response:

```json
{
  "reply": "**🌾 Banana Cordana Disease Detected**\n\nYour banana plant has...",
  "sessionId": "user-abc-123",
  "prediction": {
    "crop": "banana",
    "disease": "banana_cordana",
    "diseaseName": "Banana Cordana",
    "cropConfidence": 0.97,
    "diseaseConfidence": 0.876
  }
}
```

The frontend (`AIAdvisor.tsx`) renders:
- **`reply`** — the Gemini-generated markdown response in the chat bubble
- **`prediction`** — can be used to display a disease badge, confidence bar, or crop tag in the UI

---

## Error Handling

| Failure Point | Behaviour |
|--------------|-----------|
| No image + no message | `400` — immediate rejection |
| ML prediction fails | Logged, but chat continues — Gemini responds without disease context |
| Gemini 503 / 429 | Retried up to 3× with exponential backoff |
| Any other unhandled error | `500` — `"Failed to get response from AgriBot"` |

---

## Key Design Decisions

- **In-memory Multer** — no temp files written to disk; faster and cleaner.
- **Model singleton** — loaded once at startup, reused for all requests; avoids cold-start latency.
- **Crop-gated disease filtering** — prevents cross-crop misclassification by restricting the disease argmax to the predicted crop's class indices.
- **Session-persisted diagnosis** — farmer can ask follow-up questions ("how do I treat it?", "how much pesticide?") without re-uploading the image.
- **Low temperature (0.1)** — keeps agricultural advice factual and consistent rather than creative.
- **RAG + ML together** — ML identifies *what* the disease is; RAG provides *what to do about it* from a curated knowledge base.
