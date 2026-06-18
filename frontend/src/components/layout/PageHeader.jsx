import "../../styles/layout/PageHeader.css";

function PageHeader({
  title,
  subtitle,
  icon: Icon,
  actions,
}) {
  return (
    <header className="page-header">
      <div className="page-header-main">
        {Icon && (
          <div className="page-header-icon" aria-hidden>
            <Icon />
          </div>
        )}

        <div className="page-header-text">
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>

      {actions && (
        <div className="page-header-actions">
          {actions}
        </div>
      )}
    </header>
  );
}

export default PageHeader;
