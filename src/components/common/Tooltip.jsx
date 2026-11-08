const Tooltip = ({ children, text, position = 'top' }) => {
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div className="relative inline-block group">
      {children}
      <div className={`pointer-events-none absolute z-50 whitespace-nowrap rounded-lg border border-border-default bg-bg-secondary px-2 py-1 text-xs text-text-primary opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100 ${positionClasses[position]}`}>
        {text}
      </div>
    </div>
  );
};

export { Tooltip };
export default Tooltip;
