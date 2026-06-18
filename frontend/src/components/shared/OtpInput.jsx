import {
  useEffect,
  useRef,
  useState,
} from "react";

import "../../styles/shared/OtpInput.css";

const CODE_LENGTH = 6;

function OtpInput({
  value,
  onChange,
  disabled = false,
  autoFocus = true,
}) {
  const inputsRef = useRef([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const digits = Array.from({ length: CODE_LENGTH }, (_, index) => (
    value[index] || ""
  ));

  useEffect(() => {
    if (autoFocus && !disabled) {
      inputsRef.current[0]?.focus();
    }
  }, [autoFocus, disabled]);

  const focusInput = (index) => {
    const nextIndex = Math.max(0, Math.min(CODE_LENGTH - 1, index));
    setActiveIndex(nextIndex);
    inputsRef.current[nextIndex]?.focus();
  };

  const updateValue = (nextDigits) => {
    onChange(nextDigits.join("").slice(0, CODE_LENGTH));
  };

  const handleChange = (index, event) => {
    const raw = event.target.value.replace(/\D/g, "");

    if (!raw) {
      const nextDigits = [...digits];
      nextDigits[index] = "";
      updateValue(nextDigits);
      return;
    }

    const nextDigits = [...digits];

    if (raw.length > 1) {
      raw.split("").forEach((char, offset) => {
        const targetIndex = index + offset;
        if (targetIndex < CODE_LENGTH) {
          nextDigits[targetIndex] = char;
        }
      });
      updateValue(nextDigits);
      focusInput(Math.min(index + raw.length, CODE_LENGTH - 1));
      return;
    }

    nextDigits[index] = raw;
    updateValue(nextDigits);

    if (index < CODE_LENGTH - 1) {
      focusInput(index + 1);
    }
  };

  const handleKeyDown = (index, event) => {
    if (event.key === "Backspace") {
      event.preventDefault();

      const nextDigits = [...digits];

      if (digits[index]) {
        nextDigits[index] = "";
        updateValue(nextDigits);
        return;
      }

      if (index > 0) {
        nextDigits[index - 1] = "";
        updateValue(nextDigits);
        focusInput(index - 1);
      }
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      focusInput(index - 1);
    }

    if (event.key === "ArrowRight" && index < CODE_LENGTH - 1) {
      event.preventDefault();
      focusInput(index + 1);
    }
  };

  const handlePaste = (event) => {
    event.preventDefault();
    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, CODE_LENGTH);

    if (!pasted) {
      return;
    }

    const nextDigits = Array.from({ length: CODE_LENGTH }, (_, index) => (
      pasted[index] || ""
    ));

    updateValue(nextDigits);
    focusInput(Math.min(pasted.length, CODE_LENGTH - 1));
  };

  return (
    <div className="otp-input" onPaste={handlePaste}>
      {digits.map((digit, index) => (
        <label
          key={index}
          className={
            activeIndex === index
              ? "otp-cell is-active"
              : digit
                ? "otp-cell is-filled"
                : "otp-cell"
          }
        >
          <input
            ref={(element) => {
              inputsRef.current[index] = element;
            }}
            type="text"
            inputMode="numeric"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            maxLength={CODE_LENGTH}
            value={digit}
            disabled={disabled}
            aria-label={`Цифра ${index + 1}`}
            onFocus={() => setActiveIndex(index)}
            onChange={(event) => handleChange(index, event)}
            onKeyDown={(event) => handleKeyDown(index, event)}
          />
          <span className="otp-bar" aria-hidden="true" />
        </label>
      ))}
    </div>
  );
}

export default OtpInput;
