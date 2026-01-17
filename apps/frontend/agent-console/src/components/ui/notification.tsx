"use client";

import { useEffect, useState } from "react";
import { useNotificationStore } from "@/lib/notifications/store";
import { CheckCircle, XCircle, Info, AlertTriangle, X } from "lucide-react";
import type { NotificationType } from "@/lib/notifications/store";

const icons = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const styles = {
  success: "bg-white border-l-4 border-l-green-500 text-gray-900 shadow-xl",
  error: "bg-white border-l-4 border-l-red-500 text-gray-900 shadow-xl",
  info: "bg-white border-l-4 border-l-blue-500 text-gray-900 shadow-xl",
  warning: "bg-white border-l-4 border-l-yellow-500 text-gray-900 shadow-xl",
};

const iconStyles = {
  success: "text-green-500",
  error: "text-red-500",
  info: "text-blue-500",
  warning: "text-yellow-500",
};

export function NotificationContainer() {
  const { notifications, removeNotification } = useNotificationStore();

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-md w-full pointer-events-none">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
}

interface NotificationItemProps {
  notification: {
    id: string;
    type: NotificationType;
    message: string;
  };
  onClose: () => void;
}

function NotificationItem({ notification, onClose }: NotificationItemProps) {
  const Icon = icons[notification.type];
  const style = styles[notification.type];
  const iconStyle = iconStyles[notification.type];
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => {
        onClose();
      }, 300);
    }, 4000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  return (
    <div
      className={`
        ${style}
        rounded-lg p-4 pointer-events-auto
        ${isExiting ? "animate-slide-out-right" : "animate-slide-in-right"}
        flex items-start gap-3
        backdrop-blur-sm
        transition-all duration-300
        hover:shadow-2xl
      `}
      role="alert"
    >
      <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${iconStyle}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium break-words leading-relaxed">
          {notification.message}
        </p>
      </div>
      <button
        onClick={handleClose}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100 p-1"
        aria-label="Close notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

