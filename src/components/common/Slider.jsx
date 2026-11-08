const Slider = ({
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  className = ''
}) => {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className={`w-full h-2 bg-bg-tertiary rounded-lg appearance-none cursor-pointer accent-accent ${className}`}
    />
  );
};

export default Slider;