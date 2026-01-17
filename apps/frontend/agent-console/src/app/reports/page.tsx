"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Clock, CheckCircle } from "lucide-react";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="mt-1 text-sm text-gray-500">
          Track performance metrics, analyze ticket trends, and monitor team productivity with detailed reports and analytics.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Analytics Dashboard</CardTitle>
          <p className="mt-1 text-xs text-gray-500">
            Comprehensive insights into your support team's performance and ticket metrics
          </p>
        </CardHeader>
        <CardContent>
          <div className="py-12 text-center">
            <BarChart3 className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-4 text-sm font-medium text-gray-900">
              Reports and analytics coming soon
            </p>
            <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
              Get detailed insights into ticket volumes, response times, agent performance, and SLA compliance.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-2 max-w-3xl mx-auto">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-left">
                <TrendingUp className="h-6 w-6 text-primary-600 mb-2" />
                <h3 className="text-sm font-semibold text-gray-900 mb-1">Ticket Volume</h3>
                <p className="text-xs text-gray-600">
                  Track ticket creation trends over time
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-left">
                <Clock className="h-6 w-6 text-primary-600 mb-2" />
                <h3 className="text-sm font-semibold text-gray-900 mb-1">Response Times</h3>
                <p className="text-xs text-gray-600">
                  Monitor average response and resolution times
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-left">
                <CheckCircle className="h-6 w-6 text-primary-600 mb-2" />
                <h3 className="text-sm font-semibold text-gray-900 mb-1">SLA Compliance</h3>
                <p className="text-xs text-gray-600">
                  Track SLA adherence and breach rates
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-left">
                <BarChart3 className="h-6 w-6 text-primary-600 mb-2" />
                <h3 className="text-sm font-semibold text-gray-900 mb-1">Agent Performance</h3>
                <p className="text-xs text-gray-600">
                  Individual agent metrics and productivity
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


