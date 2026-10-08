# Mental Health AI

This project contains a frontend React application and a Python FastAPI backend for mental health text classification using a fine-tuned `distilroberta-base` model.

## Prerequisites

- Python 3.10+
- Node.js 18+
- The trained model folder placed at: `mental-health-ai/backend/model/final_distilroberta_512/`

> **Note:** The model folder is not included in the repository due to its large size. You must obtain or train the model separately and place it at the path above before running the backend.

The model folder should contain the following files:
```
mental-health-ai/backend/model/final_distilroberta_512/
├── config.json
├── tokenizer_config.json
├── tokenizer.json
├── vocab.json
├── merges.txt
├── special_tokens_map.json
└── model.safetensors   (or pytorch_model.bin)
```

---

## Getting Started

To run this software, open **two separate terminal windows** — one for the backend and one for the frontend.

---

### 1. Running the Backend (FastAPI)

1. Open a new terminal.
2. Navigate to the backend directory:
   ```powershell
   cd "mental-health-ai"
   ```
3. Activate the virtual environment:
   - On Windows: `.\venv\Scripts\activate`
   - On Mac/Linux: `source venv/bin/activate`
4. Navigate into the inner backend directory:
   ```powershell
   cd backend
   ```
5. Install dependencies (first time only):
   ```powershell
   pip install -r requirements.txt
   ```
6. Start the server:
   ```powershell
   uvicorn main:app --reload
   ```

The backend will be running at `http://127.0.0.1:8000`.

---

### 2. Running the Frontend (React + Vite)

1. Open a **second** terminal window.
2. Navigate to the frontend directory:
   ```powershell
   cd "frontend\frontend"
   ```
3. Install dependencies (first time only):
   ```powershell
   npm install
   ```
4. Start the development server:
   ```powershell
   npm run dev
   ```

The frontend will be running at `http://localhost:5173`.

---

## Running the Evaluation Script

With the backend running, you can evaluate model performance from a third terminal:

```powershell
cd "mental-health-ai"
.\venv\Scripts\activate
cd backend
python evaluation.py
```

This runs 24 test cases across all 4 categories and prints a classification report and confusion matrix.

---

## Supported Categories

| Category   | Description |
|------------|-------------|
| Normal     | No strong pattern associated with mental health issues |
| Depression | Language patterns associated with depression |
| Anxiety    | Language patterns associated with anxiety |
| Suicidal   | Language patterns associated with suicidal ideation |

---

## Note

Ensure **both** the frontend and backend servers are running simultaneously for the application to work correctly.

> ⚠️ **Disclaimer:** This is a research prototype and is **not** a medical diagnostic tool. Predictions are based on text pattern matching and should not be used as a substitute for professional mental health assessment.
