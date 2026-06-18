function FeaturedSectionHeader({
  icon: Icon,
  title,
  subtitle,
  as: Heading = "h2",
  className = "",
  children,
}) {
  return (
    <header className={`featured-card-header${className ? ` ${className}` : ""}`}>
      <div className="featured-card-heading">
        {Icon && (
          <span className="featured-card-icon-badge" aria-hidden>
            <Icon />
          </span>
        )}
        <div>
          <Heading>{title}</Heading>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      {children}
    </header>
  );
}

export default FeaturedSectionHeader;
