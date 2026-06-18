import os
from pathlib import Path

AI_ROOT = Path(__file__).resolve().parent

DATASET_PATH = AI_ROOT / "categorization" / "training" / "dataset.json"
FEEDBACK_PATH = AI_ROOT / "categorization" / "training" / "feedback.json"

CONFIDENCE_THRESHOLD = 0.75
AUTO_RETRAIN_FEEDBACK_BATCH = 5

ENABLE_ML_CATEGORIZATION = os.getenv(
    "ENABLE_ML_CATEGORIZATION",
    "true",
).lower() in ("1", "true", "yes")
