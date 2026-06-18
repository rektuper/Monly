import {
  useEffect,
  useState,
  useContext,
} from "react";

import {
  FiCheck,
  FiX,
} from "react-icons/fi";

import api from "../../api/api";
import { AuthContext } from "../../context/AuthContext";
import { getApiErrorMessage } from "../../utils/apiErrorMessage";

import useModal from "../../hooks/useModal";
import ModalPortal from "../shared/ModalPortal";
import Spinner from "../shared/Spinner";

import CategoryPicker from "./CategoryPicker";

import "../../styles/shared/AddTransactionModal.css";
import "../../styles/shared/Spinner.css";

function AddTransactionModal({
  isOpen,
  onClose,
  onTransactionAdded,
}) {

  const { user } = useContext(AuthContext);

  const {
    handleOverlayClick,
    handleModalClick,
    overlayRef,
  } = useModal({
    isOpen,
    onClose,
  });

  const [categories, setCategories] =
    useState([]);

  const [familyMembers, setFamilyMembers] =
    useState([]);

  const [canWrite, setCanWrite] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [formData, setFormData] =
    useState({

      amount: "",

      type: "expense",

      category_id: null,

      description: "",

      transaction_date:
        new Date()
          .toISOString()
          .split("T")[0],

      payer_user_id: null,

      receiver_user_id: null,
    });

  useEffect(() => {

    if (!isOpen) {
      return;
    }

    setSubmitError("");
    setSubmitting(false);
    fetchCategories();
    fetchFamily();

  }, [isOpen]);

  const fetchFamily = async () => {
    try {
      const response = await api.get("/families/me");
      const members = response.data.members || [];
      setFamilyMembers(members);
      setCanWrite(
        response.data.my_permission_role !== "observer"
      );

      setFormData((prev) => ({
        ...prev,
        payer_user_id: user?.id || null,
        receiver_user_id: user?.id || null,
      }));
    } catch (_) {
      setFamilyMembers([]);
      setCanWrite(true);
      setFormData((prev) => ({
        ...prev,
        payer_user_id: user?.id || null,
        receiver_user_id: user?.id || null,
      }));
    }
  };

  const fetchCategories =
    async () => {

      try {

        const response =
          await api.get(
            "/categories"
          );

        setCategories(
          response.data
        );

      } catch (_) { }

    };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const nextValue =
      name === "payer_user_id" || name === "receiver_user_id"
        ? Number(value)
        : value;

    setFormData({
      ...formData,
      [name]: nextValue,
    });
  };

  const suggestCategory = async (description) => {
    if (!description?.trim()) return;

    if (formData.type === "income") {
      return;
    }

    try {
      const response = await api.post("/ai/categorize", {
        description,
        transaction_type: formData.type,
      });

      const suggestedName = response.data.category;
      const match = categories.find(
        (category) =>
          category.name === suggestedName &&
          category.type === formData.type
      );

      if (match) {
        setFormData((prev) => ({
          ...prev,
          category_id: match.id,
        }));
      }
    } catch (_) {}
  };

  const changeType = (type) => {
    const filteredCategories = categories.filter(
      (category) => category.type === type
    );

    const defaultCategory =
      type === "income"
        ? filteredCategories.find(
            (category) =>
              category.name === "Пополнение"
          ) || filteredCategories[0]
        : filteredCategories[0];

    setFormData({
      ...formData,
      type,
      category_id: defaultCategory?.id || null,
    });
  };

  const handleCategoryCreated = (category) => {
    setCategories((prev) => {
      if (prev.some((item) => item.id === category.id)) {
        return prev;
      }

      return [...prev, category];
    });
  };

  const handleSubmit =
    async (e) => {

      e.preventDefault();

      if (!formData.category_id) {
        return;
      }

      if (!canWrite || submitting) {
        return;
      }

      setSubmitting(true);
      setSubmitError("");

      try {

        const payload = {
          amount: Number(
            formData.amount
          ),

          type:
            formData.type,

          category_id:
            formData.category_id,

          description:
            formData.description,

          transaction_date:
            formData.transaction_date,
        };

        if (familyMembers.length > 0) {
          if (formData.type === "expense") {
            payload.payer_user_id =
              formData.payer_user_id || user?.id;
          } else {
            payload.receiver_user_id =
              formData.receiver_user_id || user?.id;
          }
        }

        await api.post(
          "/transactions",
          payload
        );

        await onTransactionAdded?.();

        onClose();

        setFormData({

          amount: "",

          type: "expense",

          category_id: null,

          description: "",

          transaction_date:
            new Date()
              .toISOString()
              .split("T")[0],

          payer_user_id: user?.id || null,

          receiver_user_id: user?.id || null,
        });

      } catch (err) {
        setSubmitError(
          getApiErrorMessage(err, "Не удалось добавить операцию")
        );
      } finally {
        setSubmitting(false);
      }

    };

  if (!isOpen) {
    return null;
  }

  return (
    <ModalPortal isOpen={isOpen}>
    <div
      ref={overlayRef}
      className="modal-overlay"
      onClick={handleOverlayClick}
    >

      <div
        className={`modal-content${submitting ? " modal-content--loading" : ""}`}
        onClick={handleModalClick}
      >

        <h2>
          Добавить транзакцию
        </h2>

        {submitError && (
          <p className="modal-submit-error">{submitError}</p>
        )}

        {!canWrite && (
          <p className="modal-readonly-hint">
            У вас роль наблюдателя - добавление операций недоступно.
          </p>
        )}

        <form onSubmit={handleSubmit}>

          <fieldset className="modal-form-fields" disabled={submitting}>

          <div className="type-selector">

            <div
              className={
                formData.type ===
                  "expense"

                  ? "type-option active-type"

                  : "type-option"
              }

              onClick={() =>
                changeType("expense")
              }
            >
              Расход
            </div>

            <div
              className={
                formData.type ===
                  "income"

                  ? "type-option active-type"

                  : "type-option"
              }

              onClick={() =>
                changeType("income")
              }
            >
              Доход
            </div>

          </div>

          <input
            type="number"
            name="amount"
            placeholder="Сумма"
            value={formData.amount}
            onChange={handleChange}
            required
          />

          <CategoryPicker
            categories={categories}
            type={formData.type}
            categoryId={formData.category_id}
            onCategoryChange={(categoryId) =>
              setFormData((prev) => ({
                ...prev,
                category_id: categoryId,
              }))
            }
            onCategoryCreated={handleCategoryCreated}
          />

          <input
            type="text"
            name="description"
            placeholder="Описание"
            value={
              formData.description
            }
            onChange={handleChange}
            onBlur={(e) =>
              suggestCategory(e.target.value)
            }
          />

          <input
            type="date"
            name="transaction_date"
            value={
              formData.transaction_date
            }
            onChange={handleChange}
            required
          />

          {familyMembers.length > 0 && formData.type === "expense" && (
            <label className="modal-field-label">
              Кто оплатил
              <select
                name="payer_user_id"
                value={formData.payer_user_id || ""}
                onChange={handleChange}
              >
                {familyMembers.map((member) => (
                  <option
                    key={member.user_id}
                    value={member.user_id}
                  >
                    {member.name} ({member.family_role})
                  </option>
                ))}
              </select>
            </label>
          )}

          {familyMembers.length > 0 && formData.type === "income" && (
            <label className="modal-field-label">
              Получатель
              <select
                name="receiver_user_id"
                value={formData.receiver_user_id || ""}
                onChange={handleChange}
              >
                {familyMembers.map((member) => (
                  <option
                    key={member.user_id}
                    value={member.user_id}
                  >
                    {member.name} ({member.family_role})
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="modal-buttons">

            <button
              type="button"
              onClick={onClose}
              className="cancel-btn"
            >

              <span className="btn-text">
                Отмена
              </span>

              <span className="btn-icon">
                <FiX />
              </span>

            </button>

            <button
              type="submit"
              disabled={!formData.category_id || !canWrite || submitting}
            >

              <span className="btn-text">
                {submitting ? "Добавляем..." : "Добавить"}
              </span>

              <span className="btn-icon">
                <FiCheck />
              </span>

            </button>

          </div>

          </fieldset>

        </form>

        {submitting && (
          <div className="modal-loading-overlay">
            <Spinner
              size="md"
              label="Сохраняем операцию и обновляем данные..."
            />
          </div>
        )}

      </div>

    </div>
    </ModalPortal>
  );
}

export default AddTransactionModal;
