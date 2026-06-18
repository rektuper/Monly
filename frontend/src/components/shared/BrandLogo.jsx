import "../../styles/shared/BrandLogo.css";

function BrandLogo({
  variant = "full",
  className = "",
}) {
  const rootClass = [
    "brand-logo-root",
    `brand-logo-root--${variant}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (variant === "badge") {
    return (
      <div className={rootClass}>
        <div className="brand-logo-badge">
          <img
            src="/logo-short.png"
            alt="Монли"
            className="brand-logo brand-logo--short"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={rootClass}>
      <img
        src="/monli3.svg"
        alt="Монли"
        className="brand-logo brand-logo--full"
      />
    </div>
  );
}

export default BrandLogo;
