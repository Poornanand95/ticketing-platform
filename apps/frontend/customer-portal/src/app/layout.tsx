import type { Metadata } from "next";
import { AuthProvider } from "@/contexts/auth-context";
import { NotificationProvider } from "@/contexts/notification-context";
import { NotificationContainer } from "@/components/notification";
import "./globals.css";

export const metadata: Metadata = {
  title: "Customer Portal - Ticketing Platform",
  description: "Customer support ticket management portal",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50">
        <AuthProvider>
          <NotificationProvider>
            {children}
            <NotificationContainer />
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

