import json

from ai.config import DATASET_PATH


class EmbeddingCategorizer:
    def __init__(self):
        self.model = None
        self.examples = []
        self.labels = []
        self.embeddings = None

    def _ensure_model(self):
        if self.model is not None:
            return

        from sentence_transformers import SentenceTransformer

        self.model = SentenceTransformer(
            "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
        )

    def fit(self, dataset: list):
        if not dataset:
            self.examples = []
            self.labels = []
            self.embeddings = None
            return

        self._ensure_model()
        self.examples = [x["text"] for x in dataset]
        self.labels = [x["category"] for x in dataset]
        self.embeddings = self.model.encode(
            self.examples,
            convert_to_numpy=True,
        )

    def predict(self, text: str):
        if self.embeddings is None or len(self.examples) == 0:
            return None

        from sklearn.metrics.pairwise import cosine_similarity
        import numpy as np

        self._ensure_model()
        vector = self.model.encode(
            [text],
            convert_to_numpy=True,
        )

        scores = cosine_similarity(vector, self.embeddings)[0]
        best_idx = int(np.argmax(scores))

        return {
            "category": self.labels[best_idx],
            "confidence": float(scores[best_idx]),
            "source": "ml",
        }


_categorizer = None


def get_categorizer() -> EmbeddingCategorizer:
    global _categorizer

    if _categorizer is None:
        _categorizer = EmbeddingCategorizer()
        if DATASET_PATH.exists():
            dataset = json.loads(
                DATASET_PATH.read_text(encoding="utf-8")
            )
            _categorizer.fit(dataset)

    return _categorizer


def reload_categorizer(dataset: list | None = None):
    global _categorizer

    categorizer = EmbeddingCategorizer()

    if dataset is None and DATASET_PATH.exists():
        dataset = json.loads(
            DATASET_PATH.read_text(encoding="utf-8")
        )

    if dataset:
        categorizer.fit(dataset)

    _categorizer = categorizer
    return _categorizer
