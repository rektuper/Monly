import {
  useEffect,
  useState,
} from "react";

import api from "../../api/api";

import "../../styles/shared/CategoryPicker.css";

function CategoryPicker({
  label = "Категория",
  categories = [],
  type,
  categoryId,
  onCategoryChange,
  onCategoryCreated,
}) {
  const filtered = categories.filter(
    (category) => category.type === type
  );

  const [mode, setMode] = useState("list");
  const [customName, setCustomName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (mode === "other") {
      return;
    }

    if (categoryId == null) {
      if (filtered.length > 0) {
        setMode("list");
        onCategoryChange(filtered[0].id);
      }
      return;
    }

    const inList = filtered.some(
      (category) => category.id === categoryId
    );

    if (inList) {
      setMode("list");
      return;
    }

    const selected = categories.find(
      (category) => category.id === categoryId
    );

    if (selected) {
      setMode("other");
      setCustomName(selected.name);
    }
  }, [type, categories.length, categoryId, mode]);

  const selectCategory = (id) => {
    setMode("list");
    setCustomName("");
    onCategoryChange(id);
  };

  const selectOther = () => {
    setMode("other");
    setCustomName("");
    onCategoryChange(null);
  };

  const createCustomCategory = async () => {
    const name = customName.trim();

    if (!name || creating) {
      return;
    }

    setCreating(true);

    try {
      const response = await api.post(
        "/categories",
        { name, type }
      );

      const created = response.data;

      onCategoryCreated?.(created);
      setMode("list");
      onCategoryChange(created.id);
    } catch (_) {
    } finally {
      setCreating(false);
    }
  };

  const isOtherActive =
    mode === "other" ||
    (categoryId &&
      !filtered.some(
        (category) => category.id === categoryId
      ));

  return (
    <div className="category-picker">
      <span className="category-picker-label">
        {label}
      </span>

      {filtered.length === 0 && (
        <p className="category-picker-hint">
          Нет категорий для этого типа - выберите «Другое» и введите название
        </p>
      )}

      <div className="categories-dropdown">
        {filtered.map((category) => (
          <div
            key={category.id}
            className={
              mode === "list" &&
              categoryId === category.id
                ? "category-option active-category"
                : "category-option"
            }
            onClick={() =>
              selectCategory(category.id)
            }
          >
            {category.name}
          </div>
        ))}

        <div
          className={
            isOtherActive
              ? "category-option category-option-other active-category"
              : "category-option category-option-other"
          }
          onClick={selectOther}
        >
          Другое
        </div>
      </div>

      {mode === "other" && (
        <input
          type="text"
          className="category-other-input"
          placeholder="Название категории"
          value={customName}
          onChange={(e) =>
            setCustomName(e.target.value)
          }
          onBlur={createCustomCategory}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              createCustomCategory();
            }
          }}
          disabled={creating}
        />
      )}
    </div>
  );
}

export default CategoryPicker;
