import { useEffect, useRef, useState } from "react";
import { FiCalendar } from "react-icons/fi";

import {
  createPeriodState,
  toInputDate,
} from "../../utils/periodUtils";
import {
  lockModalBody,
  unlockModalBody,
} from "../../utils/modalBodyLock";
import ModalPortal from "./ModalPortal";

import "../../styles/shared/PeriodFilter.css";

function DateRangePicker({ from, to, onApply, onCancel }) {
  const [start, setStart] = useState(toInputDate(from));
  const [end, setEnd] = useState(toInputDate(to));

  useEffect(() => {
    setStart(toInputDate(from));
    setEnd(toInputDate(to));
  }, [from, to]);

  const handleApply = () => {
    if (!start || !end) return;

    const fromDate = new Date(`${start}T00:00:00`);
    const toDate = new Date(`${end}T00:00:00`);

    if (fromDate > toDate) return;

    onApply({ from: fromDate, to: toDate });
  };

  return (
    <div className="period-range-picker">
      <div className="period-range-picker-header">
        <FiCalendar aria-hidden />
        <span>Выберите период</span>
      </div>

      <div className="period-range-fields">
        <label>
          <span>С</span>
          <input
            type="date"
            value={start}
            onChange={(event) => setStart(event.target.value)}
          />
        </label>
        <label>
          <span>По</span>
          <input
            type="date"
            value={end}
            onChange={(event) => setEnd(event.target.value)}
          />
        </label>
      </div>

      <div className="period-range-actions">
        <button
          type="button"
          className="period-range-btn period-range-btn--ghost"
          onClick={onCancel}
        >
          Отмена
        </button>
        <button
          type="button"
          className="period-range-btn period-range-btn--primary"
          onClick={handleApply}
          disabled={!start || !end || start > end}
        >
          Применить
        </button>
      </div>
    </div>
  );
}

function PeriodFilter({
  value = createPeriodState(),
  onChange,
  options,
  className = "",
  ariaLabel = "Период",
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    lockModalBody();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      unlockModalBody();
    };
  }, [open]);

  const selectPreset = (preset) => {
    if (preset === "custom") {
      onChange({
        preset: "custom",
        from: value.from,
        to: value.to,
      });
      setOpen(true);
      return;
    }

    onChange(createPeriodState(preset));
    setOpen(false);
  };

  const applyRange = (range) => {
    onChange({
      preset: "custom",
      from: range.from,
      to: range.to,
    });
    setOpen(false);
  };

  return (
    <div
      ref={rootRef}
      className={`period-filter${className ? ` ${className}` : ""}`}
    >
      <div
        className="period-filter-group"
        role="group"
        aria-label={ariaLabel}
      >
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            className={
              value.preset === option.id
                ? "period-filter-btn active"
                : "period-filter-btn"
            }
            onClick={() => selectPreset(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {open && value.preset === "custom" && (
        <ModalPortal isOpen={open}>
          <div
            className="period-range-modal-overlay"
            onClick={() => setOpen(false)}
            role="presentation"
          >
            <div
              className="period-range-modal"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Выбор периода"
            >
              <DateRangePicker
                from={value.from}
                to={value.to}
                onApply={applyRange}
                onCancel={() => setOpen(false)}
              />
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}

export default PeriodFilter;
