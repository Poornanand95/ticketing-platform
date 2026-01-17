"use client";

import { useState, useEffect } from "react";
import { bucketsApi } from "@/lib/api/buckets";
import type { Bucket } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EditBucketModal } from "@/components/buckets/edit-bucket-modal";
import { CreateBucketModal } from "@/components/buckets/create-bucket-modal";
import { FolderKanban, Plus, Edit, Trash2, Tag, Calendar, FileText, AlertCircle } from "lucide-react";
import { useNotification } from "@/hooks/use-notification";
import { format } from "date-fns";

export default function BucketsPage() {
  const notification = useNotification();
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingBucket, setEditingBucket] = useState<Bucket | null>(null);
  const [creatingBucket, setCreatingBucket] = useState(false);

  useEffect(() => {
    loadBuckets();
  }, []);

  const loadBuckets = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await bucketsApi.list(true);
      setBuckets(data);
    } catch (err: any) {
      console.error("Failed to load buckets:", err);
      const errorMessage = err.response?.data?.error || err.message || "Failed to load buckets. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (bucket: Bucket) => {
    if (!confirm(`Are you sure you want to delete "${bucket.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await bucketsApi.delete(bucket.id);
      notification.success("Bucket deleted successfully");
      loadBuckets();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || "Failed to delete bucket.";
      notification.error(errorMessage);
    }
  };

  const handleUpdate = async () => {
    await loadBuckets();
    setEditingBucket(null);
  };

  const handleCreate = async () => {
    await loadBuckets();
    setCreatingBucket(false);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <div className="mb-2 text-gray-500">Loading buckets...</div>
          <div className="text-xs text-gray-400">
            Please wait while we fetch bucket information
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bucket Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Organize and categorize tickets using buckets. Create, edit, and manage your ticket buckets.
          </p>
        </div>
        <Button onClick={() => setCreatingBucket(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Bucket
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900 mb-1">Error loading buckets</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            All Buckets {buckets.length > 0 && `(${buckets.length})`}
          </CardTitle>
          {buckets.length > 0 && (
            <p className="mt-1 text-xs text-gray-500">
              Click "Edit" to modify a bucket or "Delete" to remove it. Buckets with tickets cannot be deleted.
            </p>
          )}
        </CardHeader>
        <CardContent>
          {buckets.length === 0 ? (
            <div className="py-12 text-center">
              <FolderKanban className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-4 text-sm font-medium text-gray-900">
                No buckets found
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Create your first bucket to start organizing tickets.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setCreatingBucket(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Bucket
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {buckets.map((bucket) => (
                <Card key={bucket.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          {bucket.color && (
                            <div
                              className="h-4 w-4 rounded-full border border-gray-300"
                              style={{ backgroundColor: bucket.color }}
                            />
                          )}
                          <CardTitle className="text-lg">{bucket.name}</CardTitle>
                        </div>
                        {bucket.tag && (
                          <Badge variant="info" className="text-xs">
                            <Tag className="h-3 w-3 mr-1" />
                            {bucket.tag}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {bucket.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {bucket.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
                      <div className="flex items-center space-x-1">
                        <FileText className="h-3 w-3" />
                        <span>{bucket.ticket_count || 0} ticket{(bucket.ticket_count || 0) !== 1 ? "s" : ""}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{format(new Date(bucket.created_at), "MMM d, yyyy")}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setEditingBucket(bucket)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(bucket)}
                        disabled={(bucket.ticket_count || 0) > 0}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    {(bucket.ticket_count || 0) > 0 && (
                      <p className="text-xs text-yellow-600 flex items-center">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Cannot delete: {bucket.ticket_count} ticket{(bucket.ticket_count || 0) !== 1 ? "s" : ""} assigned
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {editingBucket && (
        <EditBucketModal
          bucket={editingBucket}
          onClose={() => setEditingBucket(null)}
          onUpdate={handleUpdate}
        />
      )}

      {creatingBucket && (
        <CreateBucketModal
          onClose={() => setCreatingBucket(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}





