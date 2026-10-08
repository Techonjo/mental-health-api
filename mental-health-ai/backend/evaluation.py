import json
import os
import requests
from sklearn.metrics import classification_report, confusion_matrix

API_URL = "http://127.0.0.1:8000/predict"
DATASET_PATH = os.path.join(os.path.dirname(__file__), "test_dataset.json")

def load_test_data():
    """Load the evaluation dataset from the JSON file."""
    if not os.path.exists(DATASET_PATH):
        print(f"Error: Dataset not found at {DATASET_PATH}")
        return []
    
    with open(DATASET_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)

def run_evaluation():
    test_data = load_test_data()
    
    if not test_data:
        return

    predictions = []
    expected = []
    overrides_triggered = 0

    print(f"\nStarting evaluation on {len(test_data)} samples...\n")

    for i, item in enumerate(test_data, start=1):
        try:
            response = requests.post(API_URL, json={"text": item["text"]}, timeout=10)
            result = response.json()
            
            prediction = result.get("prediction")
            safety_override = result.get("safety_override", False)
            
            predictions.append(prediction)
            expected.append(item["expected"])

            # Highlight safety override in the logs
            override_flag = "[SAFETY ESCALATION]" if safety_override else ""
            if safety_override:
                overrides_triggered += 1

            print(
                f"{i:02d}. "
                f"Expected: {item['expected']:<10} | "
                f"Predicted: {prediction:<10} | "
                f"Confidence: {result.get('confidence')}% {override_flag}"
            )
        except Exception as e:
            print(f"{i:02d}. Failed to evaluate text: '{item['text']}' -> {str(e)}")

    print("\n" + "=" * 60)
    print(f"EVALUATION SUMMARY")
    print("=" * 60)
    print(f"Total Samples Tested: {len(test_data)}")
    print(f"Safety Overrides Triggered: {overrides_triggered}")
    
    print("\n" + "=" * 60)
    print("CLASSIFICATION REPORT")
    print("=" * 60)
    print(
        classification_report(
            expected,
            predictions,
            labels=["Normal", "Depression", "Suicidal", "Anxiety"],
            zero_division=0
        )
    )

    print("=" * 60)
    print("CONFUSION MATRIX")
    print("=" * 60)
    print(
        confusion_matrix(
            expected,
            predictions,
            labels=["Normal", "Depression", "Suicidal", "Anxiety"]
        )
    )

if __name__ == "__main__":
    run_evaluation()