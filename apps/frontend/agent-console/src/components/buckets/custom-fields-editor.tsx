"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import type { CustomFieldDefinition } from "@/types";

interface CustomFieldsEditorProps {
  fields: CustomFieldDefinition[];
  onChange: (fields: CustomFieldDefinition[]) => void;
}

const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "select", label: "Select (Dropdown)" },
  { value: "textarea", label: "Text Area" },
  { value: "boolean", label: "Boolean (Yes/No)" },
];

export function CustomFieldsEditor({ fields, onChange }: CustomFieldsEditorProps) {
  const [expandedFields, setExpandedFields] = useState<Set<number>>(new Set());

  const addField = () => {
    const newField: CustomFieldDefinition = {
      key: "",
      label: "",
      type: "text",
      required: false,
    };
    onChange([...fields, newField]);
    setExpandedFields(new Set([...expandedFields, fields.length]));
  };

  const removeField = (index: number) => {
    const updated = fields.filter((_, i) => i !== index);
    onChange(updated);
    const newExpanded = new Set(expandedFields);
    newExpanded.delete(index);
    setExpandedFields(newExpanded);
  };

  const updateField = (index: number, updates: Partial<CustomFieldDefinition>) => {
    const updated = fields.map((field, i) =>
      i === index ? { ...field, ...updates } : field
    );
    onChange(updated);
  };

  const toggleExpand = (index: number) => {
    const newExpanded = new Set(expandedFields);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedFields(newExpanded);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Custom Fields
        </label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addField}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Field
        </Button>
      </div>
      <p className="text-xs text-gray-500 mb-3">
        Define custom fields that will be available for tickets assigned to this bucket
      </p>

      {fields.length === 0 ? (
        <div className="text-center py-6 text-sm text-gray-500 border border-dashed border-gray-300 rounded-md">
          No custom fields defined. Click "Add Field" to create one.
        </div>
      ) : (
        <div className="space-y-2">
          {fields.map((field, index) => (
            <div
              key={index}
              className="border border-gray-200 rounded-md p-3 bg-gray-50"
            >
              <div className="flex items-center justify-between mb-2">
                <button
                  type="button"
                  onClick={() => toggleExpand(index)}
                  className="flex-1 text-left text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  {field.label || `Field ${index + 1}`} ({field.type})
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </button>
                <button
                  type="button"
                  onClick={() => removeField(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {expandedFields.has(index) && (
                <div className="space-y-3 mt-3 pt-3 border-t border-gray-200">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Input
                        label="Field Key"
                        type="text"
                        value={field.key}
                        onChange={(e) => updateField(index, { key: e.target.value })}
                        placeholder="e.g., customer_id"
                        required
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Unique identifier (lowercase, underscores)
                      </p>
                    </div>
                    <div>
                      <Input
                        label="Field Label"
                        type="text"
                        value={field.label}
                        onChange={(e) => updateField(index, { label: e.target.value })}
                        placeholder="e.g., Customer ID"
                        required
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Display name for the field
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Field Type
                      </label>
                      <select
                        value={field.type}
                        onChange={(e) => updateField(index, { type: e.target.value as CustomFieldDefinition["type"] })}
                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                      >
                        {FIELD_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center pt-6">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={field.required || false}
                          onChange={(e) => updateField(index, { required: e.target.checked })}
                          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700">Required</span>
                      </label>
                    </div>
                  </div>

                  {field.type === "select" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Options (comma-separated)
                      </label>
                      <Input
                        type="text"
                        value={field.options?.join(", ") || ""}
                        onChange={(e) =>
                          updateField(index, {
                            options: e.target.value.split(",").map((o) => o.trim()).filter(Boolean),
                          })
                        }
                        placeholder="e.g., Option 1, Option 2, Option 3"
                      />
                    </div>
                  )}

                  <div>
                    <Input
                      label="Placeholder"
                      type="text"
                      value={field.placeholder || ""}
                      onChange={(e) => updateField(index, { placeholder: e.target.value })}
                      placeholder="Optional placeholder text"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}





