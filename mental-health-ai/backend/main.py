from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
import re
import os


# ==============================
# MODEL PATH
# ==============================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_PATH = os.path.join(
    BASE_DIR,
    "model",
    "final_distilroberta_512"
)


# ==============================
# LOAD MODEL
# ==============================

print("Loading model...")

tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)

model = AutoModelForSequenceClassification.from_pretrained(
    MODEL_PATH
)

device = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)

model.to(device)
model.eval()

print(f"Model loaded successfully on: {device}")


# ==============================
# FASTAPI APP
# ==============================

app = FastAPI(
    title="Mental Health Text Classification API",
    description="AI-powered mental health text classification research API",
    version="1.0.0"
)


# ==============================
# CORS
# ==============================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allows all origins (update this to your Render frontend URL in production for better security)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==============================
# REQUEST MODEL
# ==============================

class PredictionRequest(BaseModel):
    text: str


# ==============================
# TEXT PREPROCESSING
# ==============================

def preprocess_text(text: str) -> str:
    """
    Clean and normalise input text before classification.
    - Collapse repeated whitespace / newlines
    - Collapse excessive punctuation (e.g. '!!!!!!' → '!')
    - Strip leading/trailing whitespace
    """
    # Collapse repeated whitespace and newlines into a single space
    text = re.sub(r"\s+", " ", text)

    # Collapse runs of the same punctuation mark (3+ → 1)
    text = re.sub(r"([!?.]){3,}", r"\1", text)

    return text.strip()


# ==============================
# CONFIDENCE LEVEL HELPER
# ==============================

# Thresholds chosen based on typical softmax output distributions
# for a 4-class fine-tuned transformer model.
HIGH_CONFIDENCE_THRESHOLD = 75.0
MEDIUM_CONFIDENCE_THRESHOLD = 55.0

# If the gap between the top-1 and top-2 class probabilities is
# smaller than this value, the prediction is considered ambiguous.
AMBIGUITY_GAP_THRESHOLD = 20.0


def get_confidence_level(confidence: float) -> str:
    """Return a human-readable confidence tier."""
    if confidence >= HIGH_CONFIDENCE_THRESHOLD:
        return "high"
    elif confidence >= MEDIUM_CONFIDENCE_THRESHOLD:
        return "medium"
    else:
        return "low"


# ==============================
# HYBRID SAFETY LAYER (RULES ENGINE)
# ==============================

# A strictly defined list of high-risk conditional phrases that 
# transformer models typically struggle to contextualise correctly.
# Used as a deterministic safety net alongside the probabilistic model.

SUICIDAL_PATTERNS = [
    r"\bend\s+my\s+life\b",
    r"\bend\s+it\s+all\b",
    r"\bend\s+everything\b",
    r"\btake\s+my\s+(own\s+)?life\b",
    r"\bkill\s+my\s*self\b",
    r"\bkill\s+myself\b",
    r"\bsuicide\b",
    r"\bsuicidal\b",
    r"\bwant\s+to\s+die\b",
    r"\bwish\s+(i\s+was|i\s+were|to\s+be)\s+dead\b",
    r"\bbetter\s+off\s+dead\b",
    r"\bbetter\s+off\s+without\s+me\b",
    r"\bno\s+reason\s+to\s+live\b",
    r"\bnot\s+worth\s+living\b",
    r"\b(?:don'?t|can'?t|not).*worth\s+living\b",
    r"\blife\s+does\s+not\s+seem\s+meaningful\b",
    r"\bmeaningless\s+life\b",
    r"\bcan'?t\s+go\s+on\b",
    r"\bdon'?t\s+want\s+to\s+(be\s+here|live|exist)\b",
    r"\bthinking\s+about\s+(ending|suicide|killing)\b",
    r"\bplanning\s+to\s+(kill|end|die)\b",
    r"\bhave\s+a\s+plan\s+to\b",
    r"\bslit\s+(my|wrist)\b",
    r"\boverdose\b",
    r"\bhanging\s+myself\b",
    r"\bjump\s+off\b",
    r"\bshoot\s+myself\b",
]

def check_suicidal_keywords(text: str) -> bool:
    """Checks input text against the deterministic safety rules engine."""
    text_lower = text.lower()
    for pattern in SUICIDAL_PATTERNS:
        if re.search(pattern, text_lower):
            return True
    return False



# ==============================
# HOME ROUTE
# ==============================

@app.get("/")
def root():
    return {
        "message": "Mental Health AI API is running"
    }


# ==============================
# PREDICTION ROUTE
# ==============================

@app.post("/predict")
def predict(request: PredictionRequest):

    # ==============================
    # PREPROCESS INPUT
    # ==============================

    text = preprocess_text(request.text)

    if not text:
        return {
            "error": "Text is required"
        }


    # ==============================
    # WORD COUNT CHECK
    # ==============================

    word_count = len(text.split())

    # Very short inputs are statistically unreliable for this model
    too_short = word_count < 8
    # TOKENIZE TEXT
    # ==============================

    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        padding=True,
        max_length=512
    )


    # ==============================
    # MOVE INPUTS TO DEVICE
    # ==============================

    inputs = {
        key: value.to(device)
        for key, value in inputs.items()
    }


    # ==============================
    # MAKE PREDICTION
    # ==============================

    with torch.no_grad():

        outputs = model(**inputs)


    # ==============================
    # CONVERT LOGITS TO PROBABILITIES
    # ==============================

    probabilities = torch.softmax(
        outputs.logits,
        dim=1
    )[0]


    # ==============================
    # GET PREDICTED CLASS
    # ==============================

    predicted_id = torch.argmax(
        probabilities
    ).item()

    prediction = model.config.id2label[
        predicted_id
    ]


    # ==============================
    # GET CONFIDENCE
    # ==============================

    confidence = round(
        probabilities[predicted_id].item() * 100,
        2
    )


    # ==============================
    # GET ALL CLASS PROBABILITIES
    # ==============================

    probabilities_result = {
        model.config.id2label[i]: round(
            probabilities[i].item() * 100,
            2
        )
        for i in range(len(probabilities))
    }


    # ==============================
    # AMBIGUITY DETECTION
    # ==============================

    # Sort all class probabilities descending
    sorted_probs = sorted(
        probabilities_result.values(),
        reverse=True
    )

    # Gap between top-1 and top-2
    top_gap = sorted_probs[0] - sorted_probs[1]
    is_ambiguous = top_gap < AMBIGUITY_GAP_THRESHOLD

    # Find the runner-up class name
    runner_up = None
    for label, prob in probabilities_result.items():
        if label != prediction and round(prob, 2) == round(sorted_probs[1], 2):
            runner_up = label
            break


    # ==============================
    # APPLY HYBRID SAFETY OVERRIDE
    # ==============================
    
    # If the text matches deterministic safety patterns that the model is known
    # to struggle with (e.g. conditional suicidal phrasing), we escalate the
    # prediction programmatically to prioritize user safety.
    
    safety_override = check_suicidal_keywords(text)

    if safety_override:
        prediction = "Suicidal"
        confidence = 100.0
        probabilities_result = {k: 0.0 for k in probabilities_result}
        if "Suicidal" in probabilities_result:
            probabilities_result["Suicidal"] = 100.0
        is_ambiguous = False
        runner_up = None


    # ==============================
    # CONFIDENCE LEVEL
    # ==============================

    confidence_level = get_confidence_level(confidence)


    # ==============================
    # RESULT DESCRIPTION
    # ==============================

    descriptions = {
        "Normal": (
            "The text does not show a strong pattern "
            "associated with the target categories."
        ),

        "Depression": (
            "The text contains patterns that the model "
            "associates more strongly with depression-related language."
        ),

        "Suicidal": (
            "The text contains patterns that the model "
            "associates more strongly with suicidal-related language."
        ),

        "Anxiety": (
            "The text contains patterns that the model "
            "associates more strongly with anxiety-related language."
        )
    }


    description = descriptions.get(
        prediction,
        "The model classified the text based on patterns "
        "learned during training."
    )


    # ==============================
    # BUILD WARNINGS
    # ==============================

    warnings = []

    if safety_override:
        warnings.append(
            "⚠️ High-risk pattern detected by Safety Layer. "
            "The system identified critical indicators that "
            "escalated this classification regardless of raw model probability."
        )

    if too_short:
        warnings.append(
            f"Short input ({word_count} words). "
            "For more reliable results, provide at least 8 words "
            "describing how you feel."
        )

    if is_ambiguous and runner_up and not safety_override:
        warnings.append(
            f"The model found similar patterns for '{prediction}' and "
            f"'{runner_up}' (gap: {round(top_gap, 1)}%). "
            "Consider adding more detail to improve accuracy."
        )

    if confidence_level == "low" and not safety_override:
        warnings.append(
            "This prediction has low confidence. The result may not "
            "be reliable — please provide a more detailed statement."
        )


    # ==============================
    # RETURN RESULT
    # ==============================

    return {
        "prediction": prediction,
        "confidence": confidence,
        "confidence_level": confidence_level,
        "is_ambiguous": is_ambiguous,
        "runner_up": runner_up,
        "safety_override": safety_override,
        "warnings": warnings,
        "word_count": word_count,
        "probabilities": probabilities_result,
        "description": description if not safety_override else (
            "The model detected high-risk language crossing the safety threshold. "
            "The prediction was escalated to prioritize safety."
        ),
        "disclaimer": (
            "This is a research classification and "
            "is not a medical diagnosis." if not safety_override else
            "This is a research classification and "
            "is not a medical diagnosis. If you or someone you know "
            "is in crisis, please contact a mental health professional "
            "or emergency services immediately."
        )
    }