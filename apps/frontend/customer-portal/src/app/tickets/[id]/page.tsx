"use client";

import { useState, useEffect, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { useNotification } from "@/contexts/notification-context";
import { ProtectedRoute } from "@/components/protected-route";
import { Navbar } from "@/components/navbar";
import type { Ticket, Message } from "@/lib/api";

const statusColors = {
  open: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  resolved: "bg-blue-100 text-blue-800",
  closed: "bg-gray-100 text-gray-800",
};

const priorityColors = {
  low: "text-gray-600",
  medium: "text-blue-600",
  high: "text-orange-600",
  urgent: "text-red-600",
};

export default function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { apiClient, user } = useAuth();
  const notification = useNotification();
  const router = useRouter();
  const { id } = use(params);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [messagesError, setMessagesError] = useState("");

  const loadTicket = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError("");
      const data = await apiClient.getTicket(id);
      setTicket(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load ticket";
      // Only show error if it's not an authorization issue (might be token expired)
      if (!errorMessage.includes("Unauthorized")) {
        setError(errorMessage);
      } else {
        // For unauthorized, try to refresh token or redirect to login
        console.error("Unauthorized access - token may be expired");
        setError("Session expired. Please log in again.");
      }
    } finally {
      setLoading(false);
    }
  }, [id, apiClient]);

  const loadMessages = useCallback(async () => {
    if (!id) return;
    try {
      setMessagesError("");
      const data = await apiClient.getMessages(id);
      setMessages(data);
    } catch (err) {
      // Messages are optional - don't block the UI if they fail to load
      const errorMessage = err instanceof Error ? err.message : "Failed to load messages";
      console.warn("Could not load messages:", errorMessage);
      setMessagesError(errorMessage);
      // Set empty array so UI doesn't break
      setMessages([]);
    }
  }, [id, apiClient]);

  useEffect(() => {
    if (id) {
      loadTicket();
      loadMessages();
    }
  }, [id, loadTicket, loadMessages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const uploadFile = async (file: File, messageId?: string) => {
    const { url, s3_key } = await apiClient.generatePresignedUrl(
      id,
      file.name,
      file.size,
      file.type
    );

    await fetch(url, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
      },
    });

    await apiClient.createAttachment(id, {
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      s3_key,
      message_id: messageId,
    });
  };

  const handleSubmitMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && selectedFiles.length === 0) return;

    setSubmitting(true);
    setUploadingFiles(true);
    setError("");

    try {
      let messageId: string | undefined;
      
      if (newMessage.trim()) {
        const message = await apiClient.createMessage(id, newMessage, false);
        messageId = message.id;
      } else if (selectedFiles.length > 0) {
        const message = await apiClient.createMessage(
          id,
          `[File attachment${selectedFiles.length > 1 ? "s" : ""}]`,
          false
        );
        messageId = message.id;
      }

      if (selectedFiles.length > 0 && messageId) {
        await Promise.all(
          selectedFiles.map((file) => uploadFile(file, messageId))
        );
      }

      setNewMessage("");
      setSelectedFiles([]);
      await loadMessages();
      await loadTicket();
      notification.success("Message sent successfully");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to send message";
      setError(errorMessage);
      notification.error(errorMessage);
    } finally {
      setSubmitting(false);
      setUploadingFiles(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center py-16 bg-white rounded-lg shadow">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 font-medium">Loading ticket details...</p>
              <p className="mt-2 text-sm text-gray-500">Please wait while we fetch the ticket information</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!ticket) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center py-16 bg-white rounded-lg shadow">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Ticket not found</h3>
              <p className="mt-2 text-sm text-gray-500">
                The ticket you're looking for doesn't exist or you don't have permission to view it.
              </p>
              <div className="mt-6">
                <Link
                  href="/tickets"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to My Tickets
                </Link>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link
            href="/tickets"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 text-sm font-semibold mb-6 transition-colors"
          >
            <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to My Tickets
          </Link>

          <div className="bg-white shadow rounded-lg p-6 sm:p-8 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 leading-tight">
                  {ticket.subject}
                </h1>
                <p className="text-sm font-medium text-gray-600 mt-2 font-mono">
                  Ticket ID: <span className="text-blue-600">{ticket.ticket_number}</span>
                </p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                    statusColors[ticket.status]
                  }`}
                  title={`Ticket status: ${ticket.status}`}
                >
                  {ticket.status}
                </span>
                <span
                  className={`text-sm font-semibold capitalize px-2 py-1 rounded ${priorityColors[ticket.priority]}`}
                  title={`Priority level: ${ticket.priority}`}
                >
                  {ticket.priority}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-gray-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Created</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">
                    {formatDate(ticket.created_at)}
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <svg className="w-5 h-5 text-gray-400 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Last Updated</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">
                    {formatDate(ticket.updated_at)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4 mb-6">
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}

          {messagesError && (
            <div className="rounded-md bg-yellow-50 border border-yellow-200 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">Conversation history unavailable</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>We couldn't load the conversation history, but you can still view the ticket details and send replies.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white shadow rounded-lg p-6 sm:p-8 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Conversation History
              </h2>
              {messages.length > 0 && (
                <span className="text-sm text-gray-500">
                  {messages.length} {messages.length === 1 ? "message" : "messages"}
                </span>
              )}
            </div>
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="mt-3 text-sm text-gray-500">No messages in this conversation yet</p>
                  <p className="mt-1 text-xs text-gray-400">Start the conversation by sending a reply below</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`border-l-4 ${
                      message.user_id === user?.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-300 bg-gray-50"
                    } p-4 sm:p-5 rounded-lg`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-sm font-bold text-gray-900">
                          {message.user_id === user?.id ? "You" : "Support"}
                        </p>
                        <p className="text-xs font-medium text-gray-600 mt-0.5">
                          {formatDate(message.created_at)}
                        </p>
                      </div>
                      {message.is_private && (
                        <span className="text-xs font-semibold text-gray-700 bg-gray-200 px-2 py-1 rounded">Private</span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-800 whitespace-pre-wrap leading-relaxed">
                      {message.content}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Add Your Reply
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Respond to this ticket or provide additional information. You can attach files if needed.
              </p>
            </div>
            <div className="mb-4 rounded-lg bg-blue-50 border border-blue-200 p-3">
              <p className="text-xs text-blue-700">
                💡 <strong>Tip:</strong> Be specific about your issue. Include screenshots or error messages if applicable to help us assist you faster.
              </p>
            </div>
            <form onSubmit={handleSubmitMessage}>
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                rows={6}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm mb-4"
                placeholder="Describe your issue or provide additional details. Be as specific as possible to help our support team assist you quickly."
              />
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Attachments (Optional)
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Upload screenshots, documents, or other files that might help explain your issue
                </p>
                <input
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {selectedFiles.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="text-sm text-gray-700 flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md"
                      >
                        <span className="truncate flex-1 font-medium">{file.name}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedFiles(
                              selectedFiles.filter((_, i) => i !== index)
                            )
                          }
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-3 font-semibold px-2 py-1 rounded transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-6 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  {submitting || uploadingFiles
                    ? "Sending your reply..."
                    : "Your reply will be visible to the support team"}
                </p>
                <button
                  type="submit"
                  disabled={
                    submitting ||
                    uploadingFiles ||
                    (!newMessage.trim() && selectedFiles.length === 0)
                  }
                  className="px-6 py-2.5 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full sm:w-auto"
                >
                  {submitting || uploadingFiles ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      Send Reply
                    </span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

