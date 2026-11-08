const Input = ({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  className = '',
  disabled = false,
  error,
  ...props
}) => {
  return (
    <div className={`w-full mb-4 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-text-secondary mb-1">
          {label}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full bg-bg-tertiary border rounded-lg px-3 py-2 text-text-primary placeholder-text-secondary transition-all focus:outline-none focus:border-accent-secondary focus:ring-1 focus:ring-accent-secondary disabled:opacity-50 disabled:cursor-not-allowed ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-border-input'}`}
        {...props}
      />
      {error && <span className="text-xs text-red-500 mt-1">{error}</span>}
    </div>
  );
};

export default Input;