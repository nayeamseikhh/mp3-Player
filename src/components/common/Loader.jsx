import { Loader2 } from 'lucide-react';

const Loader = ({ size = 24, className = '' }) => {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Loader2 className={`w-${size} h-${size} text-accent animate-spin`} />
    </div>
  );
};

export default Loader;