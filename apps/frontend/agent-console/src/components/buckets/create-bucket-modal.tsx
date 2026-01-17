"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNotification } from "@/hooks/use-notification";
import { bucketsApi } from "@/lib/api/buckets";
import { CustomFieldsEditor } from "./custom-fields-editor";
import type { CustomFieldDefinition } from "@/types";
import { X, AlertCircle } from "lucide-react";

interface CreateBucketModalProps {
  onClose: () => void;
  onCreate: () => void;
}

export function CreateBucketModal({ onClose, onCreate }: CreateBucketModalProps) {
  const notification = useNotification();
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#3B82F6");
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!name.trim()) {
      setError("Bucket name is required");
      return;
    }

    setIsLoading(true);

    try {
      await bucketsApi.create({
        name: name.trim(),
        tag: tag.trim() || null,
        description: description.trim() || null,
        color: color || null,
        custom_fields: customFields.length > 0 ? customFields : undefined,
      });
      notification.success("Bucket created successfully!");
      onCreate();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || "Failed to create bucket.";
      setError(errorMessage);
      notification.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="relative w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Create New Bucket</h2>
            <p className="mt-1 text-sm text-gray-500">
              Create a new bucket to organize and categorize tickets.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5 text-gray-500" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              {error}
            </div>
          )}

          <div>
            <Input
              label="Bucket Name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g., High Priority, Customer Support"
              disabled={isLoading}
              helperText="A unique name to identify this bucket"
            />
          </div>

          <div>
            <Input
              label="Tag"
              type="text"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="e.g., urgent, vip, feature"
              disabled={isLoading}
              helperText="Optional tag for quick identification"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-50"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what types of tickets belong in this bucket"
              rows={3}
              disabled={isLoading}
            />
            <p className="mt-1 text-xs text-gray-500">
              Optional description of the bucket's purpose
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Color
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
                disabled={isLoading}
              />
              <Input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="#3B82F6"
                disabled={isLoading}
                className="flex-1"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Optional color to visually distinguish this bucket
            </p>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <CustomFieldsEditor
              fields={customFields}
              onChange={setCustomFields}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button variant="outline" onClick={onClose} type="button" disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoading} disabled={isLoading || !name.trim()}>
              {isLoading ? "Creating..." : "Create Bucket"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

