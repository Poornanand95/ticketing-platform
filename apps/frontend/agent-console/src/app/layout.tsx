import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/providers/auth-provider";
import { NotificationContainer } from "@/components/ui/notification";

export const metadata: Metadata = {
  title: "Agent Portal - Ticketing Platform",
  description: "Agent console for managing support tickets",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
          <NotificationContainer />
        </AuthProvider>
      </body>
    </html>
  );
}
