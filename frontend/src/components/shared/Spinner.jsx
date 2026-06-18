import "../../styles/shared/Spinner.css";

function Spinner({ label, size = "md", className = "" }) {
  return (
    <div
      className={`ui-spinner ui-spinner--${size} ${className}`.trim()}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="ui-spinner-ring" aria-hidden="true" />
      {label ? (
        <span className="ui-spinner-label">{label}</span>
      ) : null}
    </div>
  );
}

export default Spinner;
