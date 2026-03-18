import { CheckCircle, AlertCircle, Info } from 'lucide-react';

export default function Toast({ toasts }) {
  if (!toasts.length) return null;

  const icons = {
    success: <CheckCircle size={18} />,
    error: <AlertCircle size={18} />,
    info: <Info size={18} />,
  };

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          {icons[toast.type]}
          {toast.message}
        </div>
      ))}
    </div>
  );
}
