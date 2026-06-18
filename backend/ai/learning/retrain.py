from ai.categorization.categorize import load_dataset
from ai.categorization.ml.model import reload_categorizer
from ai.learning.merge_feedback import merge_feedback_into_dataset


def retrain_model() -> dict:
    merge_result = merge_feedback_into_dataset()
    dataset = load_dataset()
    reload_categorizer(dataset)

    return {
        "status": "ok",
        "dataset_size": len(dataset),
        "merged": merge_result,
    }
