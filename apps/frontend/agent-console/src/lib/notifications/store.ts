import { create } from "zustand";

export type NotificationType = "success" | "error" | "info" | "warning";

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
}

interface NotificationState {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, "id">) => void;
  removeNotification: (id: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],

  addNotification: (notification) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newNotification: Notification = {
      ...notification,
      id,
      duration: notification.duration ?? 4000,
    };

    set((state) => ({
      notifications: [...state.notifications, newNotification],
    }));

    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      }, newNotification.duration);
    }
  },

  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },

  success: (message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    const notification: Notification = {
      id,
      type: "success",
      message,
      duration: 4000,
    };

    set((state) => ({
      notifications: [...state.notifications, notification],
    }));

    setTimeout(() => {
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      }));
    }, 4000);
  },

  error: (message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    const notification: Notification = {
      id,
      type: "error",
      message,
      duration: 4000,
    };

    set((state) => ({
      notifications: [...state.notifications, notification],
    }));

    setTimeout(() => {
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      }));
    }, 4000);
  },

  info: (message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    const notification: Notification = {
      id,
      type: "info",
      message,
      duration: 4000,
    };

    set((state) => ({
      notifications: [...state.notifications, notification],
    }));

    setTimeout(() => {
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      }));
    }, 4000);
  },

  warning: (message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    const notification: Notification = {
      id,
      type: "warning",
      message,
      duration: 4000,
    };

    set((state) => ({
      notifications: [...state.notifications, notification],
    }));

    setTimeout(() => {
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      }));
    }, 4000);
  },
}));
