import { X } from 'lucide-react';

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  className = ''
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className={`relative flex w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border-default bg-bg-tertiary shadow-2xl max-h-[90vh] max-h-[90dvh] ${className}`}>
        {title && (
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border-default px-4 py-3 sm:px-6 sm:py-4">
            <h3 className="min-w-0 text-lg font-semibold text-text-primary">{title}</h3>
            <button onClick={onClose} aria-label="Close dialog" className="shrink-0 rounded-lg p-1 text-text-secondary hover:bg-bg-secondary hover:text-text-primary">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </div>
        {footer && <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-border-default bg-bg-secondary p-3 sm:p-4">{footer}</div>}
      </div>
    </div>
  );
};

export default Modal;
