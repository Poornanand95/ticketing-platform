"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/lib/auth/store";
import { User, Mail, Building, Shield } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your account information and preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <p className="mt-1 text-xs text-gray-500">
            Your account details and role information
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-start space-x-3">
            <div className="rounded-full bg-primary-100 p-2">
              <User className="h-5 w-5 text-primary-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Full Name
              </p>
              <p className="mt-1 text-sm font-medium text-gray-900">{user?.name || "N/A"}</p>
              <p className="mt-1 text-xs text-gray-500">
                This is your display name shown throughout the platform
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="rounded-full bg-primary-100 p-2">
              <Mail className="h-5 w-5 text-primary-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Email Address
              </p>
              <p className="mt-1 text-sm font-medium text-gray-900">{user?.email || "N/A"}</p>
              <p className="mt-1 text-xs text-gray-500">
                Your email address is used for login and notifications
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="rounded-full bg-primary-100 p-2">
              <Building className="h-5 w-5 text-primary-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Organization ID
              </p>
              <p className="mt-1 font-mono text-sm font-medium text-gray-900">
                {user?.org_id || "N/A"}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Your organization identifier for multi-tenant isolation
              </p>
            </div>
          </div>

          {user?.roles && user.roles.length > 0 && (
            <div className="flex items-start space-x-3">
              <div className="rounded-full bg-primary-100 p-2">
                <Shield className="h-5 w-5 text-primary-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Roles & Permissions
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {user.roles.map((role) => (
                    <Badge
                      key={role}
                      variant={role === "admin" ? "success" : "info"}
                    >
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </Badge>
                  ))}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Your assigned roles determine what actions you can perform in the system
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account Management</CardTitle>
          <p className="mt-1 text-xs text-gray-500">
            Additional account settings and preferences
          </p>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm text-gray-600">
              Password changes and additional account settings will be available soon.
              Contact your administrator for account modifications.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


