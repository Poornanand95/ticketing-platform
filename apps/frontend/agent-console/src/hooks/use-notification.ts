import { useNotificationStore } from "@/lib/notifications/store";

export function useNotification() {
  const { success, error, info, warning } = useNotificationStore();

  return {
    success,
    error,
    info,
    warning,
  };
}
