"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useNotification } from "@/contexts/notification-context";
import { ProtectedRoute } from "@/components/protected-route";
import { Navbar } from "@/components/navbar";

export default function NewTicketPage() {
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [requiredSkill, setRequiredSkill] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { apiClient } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const ticket = await apiClient.createTicket({
        subject,
        priority,
        source: "web",
        required_skill: requiredSkill.trim() ? requiredSkill.trim() : null,
        metadata: description ? { description } : undefined,
      });

      if (description) {
        await apiClient.createMessage(ticket.id, description, false);
      }

      router.push(`/tickets/${ticket.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create ticket");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Create New Support Ticket</h1>
            <p className="mt-2 text-sm text-gray-500">
              Submit a new support request. Our team will respond as soon as possible.
            </p>
          </div>

          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  <strong>Tip:</strong> Provide as much detail as possible in your description. Include error messages, steps to reproduce the issue, and any relevant screenshots or files.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error creating ticket</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 sm:p-8">
            <div className="mb-6">
              <label
                htmlFor="subject"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Subject <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500 mb-3">
                A brief summary of your issue (e.g., "Unable to process payment" or "Account access problem")
              </p>
              <input
                type="text"
                id="subject"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="block w-full px-4 py-2.5 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors"
                placeholder="Enter a brief description of your issue..."
              />
            </div>

            <div className="mb-6">
              <label
                htmlFor="required-skill"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Required Skill (Optional)
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Specify if your issue requires a specific expertise (e.g., "billing", "claims", "technical support")
              </p>
              <input
                type="text"
                id="required-skill"
                value={requiredSkill}
                onChange={(e) => setRequiredSkill(e.target.value)}
                className="block w-full px-4 py-2.5 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors"
                placeholder='e.g., "billing", "claims", "technical"'
              />
            </div>

            <div className="mb-6">
              <label
                htmlFor="priority"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Priority Level
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Select the urgency of your request. Urgent issues are for critical problems that need immediate attention.
              </p>
              <select
                id="priority"
                value={priority}
                onChange={(e) =>
                  setPriority(
                    e.target.value as "low" | "medium" | "high" | "urgent"
                  )
                }
                className="block w-full px-4 py-2.5 rounded-md border border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:text-sm transition-colors appearance-none cursor-pointer"
                style={{ minHeight: '42px' }}
              >
                <option value="low">Low - General inquiry, no rush</option>
                <option value="medium">Medium - Standard support request</option>
                <option value="high">High - Important issue requiring prompt attention</option>
                <option value="urgent">Urgent - Critical issue requiring immediate resolution</option>
              </select>
            </div>

            <div className="mb-6">
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Detailed Description
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Include all relevant details: what happened, when it occurred, steps you've already tried, and any error messages you received.
              </p>
              <textarea
                id="description"
                rows={8}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="block w-full px-4 py-3 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors"
                placeholder="Describe your issue in detail. Include:\n• What you were trying to do\n• What went wrong\n• Steps to reproduce the issue\n• Any error messages you saw\n• What you've already tried to fix it"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2.5 border border-gray-300 rounded-md shadow-sm text-sm font-semibold text-gray-900 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !subject.trim()}
                className="px-6 py-2.5 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Ticket...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Ticket
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  );
}

