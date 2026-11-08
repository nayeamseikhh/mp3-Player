import { Music2, FolderX } from 'lucide-react';

const EmptyState = ({
  icon: Icon = Music2,
  title = 'No data available',
  subtitle,
  action,
  className = ''
}) => {
  return (
    <div className={`flex flex-col items-center justify-center py-16 text-center ${className}`}>
      <div className="w-20 h-20 bg-bg-tertiary rounded-full flex items-center justify-center mb-6 border border-border-default">
        <Icon className="w-8 h-8 text-text-secondary" />
      </div>
      <h3 className="text-lg font-medium text-text-primary mb-2">{title}</h3>
      {subtitle && <p className="text-text-secondary max-w-sm mb-8">{subtitle}</p>}
      {action && action}
    </div>
  );
};

export default EmptyState;