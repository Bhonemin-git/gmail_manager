import { X, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';
import { NotificationType } from '../types/notification';

const notificationConfig = {
  success: {
    icon: CheckCircle,
    bgColor: 'bg-green-50 dark:bg-green-900/30',
    borderColor: 'border-green-200 dark:border-green-800',
    textColor: 'text-green-800 dark:text-green-300',
    iconColor: 'text-green-600 dark:text-green-400'
  },
  error: {
    icon: XCircle,
    bgColor: 'bg-red-50 dark:bg-red-900/30',
    borderColor: 'border-red-200 dark:border-red-800',
    textColor: 'text-red-800 dark:text-red-300',
    iconColor: 'text-red-600 dark:text-red-400'
  },
  info: {
    icon: AlertCircle,
    bgColor: 'bg-gray-50 dark:bg-gray-900/30',
    borderColor: 'border-gray-200 dark:border-gray-800',
    textColor: 'text-gray-800 dark:text-gray-300',
    iconColor: 'text-gray-600 dark:text-gray-400'
  },
  warning: {
    icon: AlertCircle,
    bgColor: 'bg-amber-50 dark:bg-amber-900/30',
    borderColor: 'border-amber-200 dark:border-amber-800',
    textColor: 'text-amber-800 dark:text-amber-300',
    iconColor: 'text-amber-600 dark:text-amber-400'
  }
};

export function NotificationCenter() {
  const { notifications, removeNotification } = useNotifications();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-20 right-3 md:top-24 md:right-4 z-50 space-y-2 w-full max-w-[calc(100vw-1.5rem)] md:max-w-md px-3 md:px-0">
      {notifications.map(notification => {
        const config = notificationConfig[notification.type as NotificationType];
        const Icon = config.icon;

        return (
          <div
            key={notification.id}
            className={`${config.bgColor} ${config.borderColor} border rounded-lg p-3 md:p-4 shadow-lg animate-slide-in-right flex items-start gap-2 md:gap-3`}
          >
            <Icon className={`w-4 h-4 md:w-5 md:h-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />
            <p className={`${config.textColor} font-medium flex-1 text-sm md:text-base break-words`}>
              {notification.message}
            </p>
            <button
              onClick={() => removeNotification(notification.id)}
              className={`${config.iconColor} hover:opacity-70 transition-opacity flex-shrink-0 p-1 -mr-1`}
              aria-label="Close notification"
            >
              <X className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
