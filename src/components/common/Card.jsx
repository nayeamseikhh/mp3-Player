const Card = ({
  children,
  className = '',
  hoverable = false,
  onClick,
  padding = 'p-4',
  header,
  footer
}) => {
  const classTokens = className.split(/\s+/).filter(Boolean);
  const contentPadding = classTokens.filter((token) => /^(?:[a-z]+:)?p-/.test(token));
  const containerClasses = classTokens.filter((token) => !/^(?:[a-z]+:)?p-/.test(token));

  return (
    <div
      className={`bg-bg-tertiary border border-border-default rounded-xl overflow-hidden transition-all duration-200 ${hoverable ? 'hover:bg-accent/5 hover:border-accent/50 cursor-pointer' : ''} ${containerClasses.join(' ')}`}
      onClick={onClick}
    >
      {header && <div className="border-b border-border-default p-4">{header}</div>}
      <div className={contentPadding.length ? contentPadding.join(' ') : padding}>{children}</div>
      {footer && <div className="border-t border-border-default p-4">{footer}</div>}
    </div>
  );
};

export default Card;
