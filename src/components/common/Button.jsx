const Button = ({
  children,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  onClick,
  className = '',
  icon,
  iconPosition = 'left',
  ...props
}) => {
  const variantClasses = {
    primary: 'bg-accent text-accent-foreground hover:bg-accent-hover active:scale-95',
    secondary: 'bg-bg-tertiary border border-border-default text-text-primary hover:bg-accent/10 active:scale-95',
    ghost: 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-bg-tertiary active:scale-95',
    danger: 'bg-red-600 text-white hover:bg-red-700 active:scale-95',
    outline: 'border border-border-default text-text-primary hover:bg-accent/10 active:scale-95',
  };

  const sizeClasses = {
    tiny: 'p-1 text-xs',
    small: 'px-3 py-1.5 text-sm',
    medium: 'px-4 py-2',
    large: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent-secondary disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {icon && iconPosition === 'left' && <span className="w-4 h-4">{icon}</span>}
      {children}
      {icon && iconPosition === 'right' && <span className="w-4 h-4">{icon}</span>}
    </button>
  );
};

export default Button;
