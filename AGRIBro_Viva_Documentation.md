# AGRIBro - Comprehensive Viva Documentation

## 1. Project Overview & Objective
**AGRIBro** is a comprehensive, full-stack digital agriculture platform crafted for Indian farmers. Its primary goal is to empower rural communities by bridging the gap between farming technology, market accessibility, and expert agricultural advice. The platform integrates e-commerce (market/input store), logistics tracking, a community forum, and an advanced AI-powered agriculture advisor equipped with Machine Learning (ML) disease detection and Retrieval-Augmented Generation (RAG).

**Primary Target Audience (Roles):**
*   **Farmers:** Sell crops, buy inputs, request logistics, and seek AI advice.
*   **Buyers (Retailers/Wholesalers):** Bid on crops, purchase bulk items, track crop logistics.
*   **Vendors:** Sell agricultural inputs (seeds, fertilizers, equipment).
*   **Transporters:** Accept logistics delivery requests and update live delivery tracking.

---

## 2. Tech Stack & Libraries

### Frontend (Client-Side)
*   **Core:** React 18, TypeScript, Vite (bundler for fast HMR).
*   **Styling & UI:** Tailwind CSS (utility-first CSS framework for rapid UI design), Lucide React & Heroicons (iconography).
*   **Routing:** React Router DOM v7 (client-side routing, protected routes).
*   **State Management:** React Context API (AuthContext, DataContext) for global state.
*   **Mapping & Location:** Leaflet, React-Leaflet (interactive maps for logistics tracking and location picking).
*   **Other Libraries:** Axios (HTTP requests), html2canvas & jspdf (for saving/exporting UI components if needed), React-hot-toast (notification popups), React-Markdown (rendering AI chat responses).

### Backend (Server-Side)
*   **Core:** Node.js, Express.js (REST API framework).
*   **Database Structure:** Dual-support architecture. Primarily designed for **MongoDB** (using Mongoose/Node MongoDB Native driver), but features a robust **JSON-based flat-file fallback (`db.json`)** if MongoDB is unavailable.
*   **Authentication & Security:** JWT (JSON Web Tokens) for stateless authentication, Bcrypt (password hashing).
*   **File Handling:** Multer (multipart/form-data parsing for image uploads), Jimp (pure JS image manipulation).

### AI & Machine Learning Infrastructure
*   **Large Language Model (LLM):** Google Generative AI (`@google/generative-ai`) utilizing the **Gemini-Flash-Latest** model for the AgriBot chatbot.
*   **Machine Learning (Vision):** TensorFlow.js (`@tensorflow/tfjs`) running a custom image classification model (EfficientNet architecture) directly in Node.js (pure JS mode without `tfjs-node` bindings) to detect crop diseases (Banana & Rice).
*   **Retrieval-Augmented Generation (RAG) Pipeline:**
    *   **Vector Database:** LanceDB (`@lancedb/lancedb`) - an embedded vector database for fast similarity search.
    *   **Embeddings:** HuggingFace Transformers (`@huggingface/transformers`) utilizing the `Xenova/all-MiniLM-L6-v2` model.
    *   **Document Chunking:** LangChain TextSplitters (`@langchain/textsplitters`) with `RecursiveCharacterTextSplitter`.
    *   **PDF Extraction:** `pdfjs-dist` to parse agricultural knowledge base PDFs.

---

## 3. Core Features & Implementation Workflow

### Feature 1: Role-Based Authentication (`routes/auth.js`)
*   **Workflow:** Users sign up selecting their role (`farmer`, `buyer`, `vendor`, `transporter`). Passwords are hashed using **Bcrypt**. Upon successful login, the server generates a **JWT (JSON Web Token)** containing the user's ID and Role.
*   **Implementation:** The Frontend stores this JWT in `localStorage` and sends it in the `Authorization: Bearer <token>` header for all protected API requests. Backend middleware (`middleware.js`) intercepts requests, verifies the token, and attaches the user object to `req.user`.

### Feature 2: Crop Marketplace (Bidding System) (`routes/crops.js`)
*   **Workflow:** Farmers list their harvested crops with a base price, quantity, and auction end time. Buyers can view these listings and place bids.
*   **Implementation:**
    *   The `CropCard` UI component on the frontend displays the crop details and highest bid.
    *   When a Buyer bids, a POST request hits `/crops/:id/bids`.
    *   The backend validates if the new bid amount > current highest bid. If valid, the bid is appended to the crop's `bids` array and `currentBid` is updated in the database.

### Feature 3: Input Store (E-commerce) (`routes/inputs.js`)
*   **Workflow:** Vendors add farming inputs (seeds, fertilizers). Farmers and Buyers can purchase them.
*   **Implementation:** Standard CRUD (Create, Read, Update, Delete) operations. The frontend filters inputs by category (Seeds, Fertilizers, Equipment) using state, mapping over the filtered array to render `InputCard` components.

### Feature 4: Live Logistics & Transport Tracking (`routes/logistics.js`)
*   **Workflow:**
    1.  Farmer requests transport for a crop via a multi-step form, selecting pickup & drop constraints using an inline Leaflet map widget (`InlineLocationPicker.tsx`).
    2.  The request enters a **'Pending'** state.
    3.  A Transporter logs into their dashboard, views pending jobs, and accepts one (State changes to **'Accepted'**, then **'In-Transit'**).
    4.  The Transporter updates delivery progress (0% to 100%) via slider/GPS.
*   **Implementation:** The backend logistics route manages the state machine (`pending` -> `accepted` -> `in-transit` -> `completed`). The frontend `LiveMapTracker` component visually moves a truck pin along a drawn route (often utilizing OSRM routing data) based on the `progress` percentage fetched from the backend.

### Feature 5: AI Advisor & Machine Learning Pipeline - "AgriBot" (`routes/chat.js`)
*This is the most technically complex feature of the project, combining ML, RAG, and LLMs.*

**The Combined Workflow (When a user uploads a sick leaf image & asks a question):**

1.  **Image Upload:** The React frontend captures the image and message, appending them to a `FormData` object.
2.  **Backend Reception:** Express receives the request. `Multer` buffers the image into memory.
3.  **Step 1: ML Disease Detection (`ml/predict.js` & `ml/loadModel.js`)**
    *   The raw image buffer is passed to `Jimp` for **Preprocessing** (`ml/preprocess.js`). Jimp resizes the image to 224x224 and manually strips the alpha channel, normalizing RGB values to [0, 1]. This produces a `Float32Array` which is converted into a TensorFlow 4D tensor `[1, 224, 224, 3]`.
    *   The preprocessed tensor is fed into the **TensorFlow.js GraphModel**.
    *   The model outputs probabilities. A custom mapping (`diseaseMap.js`) decodes the highest probability index into a specific Crop (Banana/Rice) and Disease (e.g., "Banana Sigatoka").
    *   *Result:* We now have a string like: `[Active Disease Diagnosis]: Banana Sigatoka detected with 92% confidence.`
4.  **Step 2: RAG Pipeline Context Retrieval (`rag/retriever.js`)**
    *   The user's text question (enhanced with the ML diagnosis) is passed to the **HuggingFace Embedding Model** (`all-MiniLM-L6-v2`), converting the text into a numerical vector.
    *   This query vector is searched against the pre-indexed **LanceDB Vector Database**, which contains agricultural knowledge parsed from PDFs (`rag/ingest.js`).
    *   The database returns the top-K most similar text chunks (relevant agricultural advice).
5.  **Step 3: Gemini Prompt Engineering & Execution**
    *   The backend constructs a massive **System Prompt**. It injects:
        *   The ML Diagnosis Context.
        *   The RAG retrieved agricultural data.
        *   Strict formatting rules (Hinglish/Hindi/English styling, markdown formatting, emoji usage).
    *   The backend retrieves the user's past chat history for this specific conversation thread (Topic ID) from the Database.
    *   The Google `gemini-flash-latest` model is invoked with the System Prompt, the Chat History, and the user's current query.
6.  **Response & Storage:** Gemini generates a contextual, culturally appropriate response. The backend saves both the User's message (with ML results & image URL) and the Model's reply into the `chat_messages` DB collection, then sends the JSON response back to the React UI, which renders it using `react-markdown`.

---

## 4. Database Fallback Mechanism (The `db.js` wrapper)
A key architectural feature to mention in the viva is the resilience of the data layer. 
The application abstracts all database interactions inside `src/db.js`. 
*   On startup, it attempts to connect to a **MongoDB** cluster using Mongoose.
*   If the connection fails or `MONGO_URI` is missing, the backend seamlessly falls back to a **local JSON flat-file storage system (`db.json`)**. 
*   Helper functions (`mongoFind`, `mongoInsertOne`, `readDB`, `writeDB`) handle the specific logic, meaning the route handlers (e.g., `crops.js`, `auth.js`) do not crash and the app remains functional for demonstration purposes.

---

## 5. Potential Viva Questions & Answers

**Q: How did you implement real-time tracking for logistics without WebSockets?**
*A: Currently, the implementation relies on the Transporter manually updating the progress slider, which sends a PATCH request to the backend. The farmer dashboard fetches the updated progress periodically or on page refresh. To make it truly real-time, we could implement WebSockets (Socket.io) or Server-Sent Events (SSE) to push progress updates instantly to the farmer.*

**Q: Why use Jimp instead of the native `@tensorflow/tfjs-node` image decoder?**
*A: Using `tfjs-node` requires native C++ bindings which frequently cause compilation errors on different operating systems (especially Windows) depending on Node and Python versions. By using Jimp (a pure JavaScript image processing library) to resize and normalize the image buffer, and then manually constructing the tensor, we ensure the backend is 100% platform-independent and easy to deploy.*

**Q: What is the purpose of RAG (Retrieval-Augmented Generation) in your Chatbot?**
*A: Base LLMs like Gemini have a knowledge cutoff and might hallucinate specific agricultural practices or local Indian schemes. RAG solves this by converting our custom, verified agricultural PDFs into vector embeddings. When a user asks a question, we retrieve the exact relevant paragraphs from our database and append them to the LLM's prompt. This forces the LLM to generate an answer based ONLY on our factual data, reducing hallucinations drastically.*

**Q: How does the AI know what disease the plant has?**
*A: We combined Vision ML with the LLM. Before passing the question to Gemini, we intercept the image on our Express server. We run a custom TensorFlow.js model classification on the image. We take the textual output (e.g., "Rice Blast, 85% confidence") and prepend it as a hidden context string to the user's prompt before sending it to Gemini. Gemini then acts as a doctor reading a lab report, providing treatment advice based on that context.*
