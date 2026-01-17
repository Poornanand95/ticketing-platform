"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, Trash2 } from "lucide-react";
import { automationApi } from "@/lib/api/automation";
import { useNotification } from "@/hooks/use-notification";
import type { AutomationRule } from "@/types";

interface AutomationFormProps {
  rule?: AutomationRule | null;
  orgId: string;
  onClose: () => void;
  onSave: () => void;
}

const CONDITION_FIELDS = [
  { value: "status", label: "Status" },
  { value: "priority", label: "Priority" },
  { value: "source", label: "Source" },
  { value: "required_skill", label: "Required Skill" },
  { value: "subject", label: "Subject" },
  { value: "assigned_to", label: "Assigned To" },
  { value: "bucket_id", label: "Bucket" },
  { value: "days_since_created", label: "Days Since Created" },
  { value: "days_since_last_activity", label: "Days Since Last Activity" },
];

const CONDITION_OPERATORS = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Not Equals" },
  { value: "contains", label: "Contains" },
  { value: "starts_with", label: "Starts With" },
  { value: "ends_with", label: "Ends With" },
  { value: "greater_than", label: "Greater Than" },
  { value: "less_than", label: "Less Than" },
  { value: "in", label: "In" },
  { value: "is_null", label: "Is Null" },
  { value: "is_not_null", label: "Is Not Null" },
];

const ACTION_TYPES = [
  { value: "assign_agent", label: "Assign Agent" },
  { value: "set_priority", label: "Set Priority" },
  { value: "assign_to_bucket", label: "Assign to Bucket" },
  { value: "add_observer", label: "Add Observer" },
  { value: "escalate", label: "Escalate" },
  { value: "close_ticket", label: "Close Ticket" },
  { value: "send_notification", label: "Send Notification" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export function AutomationForm({
  rule,
  orgId,
  onClose,
  onSave,
}: AutomationFormProps) {
  const notification = useNotification();
  const [name, setName] = useState("");
  const [priority, setPriority] = useState(0);
  const [enabled, setEnabled] = useState(true);
  const [conditions, setConditions] = useState<
    Array<{ field: string; operator: string; value: unknown }>
  >([{ field: "status", operator: "equals", value: "" }]);
  const [actions, setActions] = useState<
    Array<{ type: string; params: Record<string, unknown> }>
  >([{ type: "set_priority", params: {} }]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (rule) {
      setName(rule.name);
      setPriority(rule.priority);
      setEnabled(rule.enabled);
      setConditions(rule.conditions);
      setActions(rule.actions);
    }
  }, [rule]);

  const handleAddCondition = () => {
    setConditions([
      ...conditions,
      { field: "status", operator: "equals", value: "" },
    ]);
  };

  const handleRemoveCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const handleUpdateCondition = (
    index: number,
    field: string,
    value: string | unknown
  ) => {
    const updated = [...conditions];
    updated[index] = { ...updated[index], [field]: value };
    setConditions(updated);
  };

  const handleAddAction = () => {
    setActions([...actions, { type: "set_priority", params: {} }]);
  };

  const handleRemoveAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const handleUpdateAction = (
    index: number,
    field: string,
    value: string | unknown
  ) => {
    const updated = [...actions];
    if (field === "type") {
      updated[index] = { type: value as string, params: {} };
    } else {
      updated[index] = {
        ...updated[index],
        params: { ...updated[index].params, [field]: value },
      };
    }
    setActions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      notification.error("Rule name is required");
      return;
    }

    if (conditions.length === 0) {
      notification.error("At least one condition is required");
      return;
    }

    if (actions.length === 0) {
      notification.error("At least one action is required");
      return;
    }

    // Validate conditions
    for (const condition of conditions) {
      if (!condition.field || !condition.operator) {
        notification.error("All condition fields must be filled");
        return;
      }
      if (
        !["is_null", "is_not_null"].includes(condition.operator) &&
        condition.value === ""
      ) {
        notification.error("All condition values must be filled");
        return;
      }
    }

    setIsSaving(true);
    try {
      const ruleData = {
        org_id: orgId,
        name: name.trim(),
        priority,
        conditions: conditions.map((c) => ({
          ...c,
          value: c.operator === "in" && typeof c.value === "string"
            ? c.value.split(",").map((v) => v.trim())
            : c.value,
        })),
        actions,
        enabled,
        is_default: rule?.is_default || false,
      };

      if (rule) {
        await automationApi.update(rule.id, ruleData);
        notification.success("Automation updated successfully");
      } else {
        await automationApi.create(ruleData);
        notification.success("Automation created successfully");
      }

      onSave();
    } catch (error: any) {
      console.error("Failed to save automation:", error);
      notification.error(
        error.response?.data?.error || "Failed to save automation"
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{rule ? "Edit Automation" : "Create Automation"}</CardTitle>
            {rule?.is_default && (
              <p className="mt-1 text-xs text-yellow-600">
                Editing a default automation rule
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rule Name <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Auto-assign high priority tickets"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <Input
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value))}
                  min="0"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Higher priority rules execute first
                </p>
              </div>

              <div>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Enabled
                  </span>
                </label>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Conditions <span className="text-red-500">*</span>
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddCondition}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Condition
                </Button>
              </div>
              <div className="space-y-2">
                {conditions.map((condition, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-2 p-3 border border-gray-200 rounded-md"
                  >
                    <select
                      value={condition.field}
                      onChange={(e) =>
                        handleUpdateCondition(index, "field", e.target.value)
                      }
                      className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                    >
                      {CONDITION_FIELDS.map((field) => (
                        <option key={field.value} value={field.value}>
                          {field.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={condition.operator}
                      onChange={(e) =>
                        handleUpdateCondition(index, "operator", e.target.value)
                      }
                      className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                    >
                      {CONDITION_OPERATORS.map((op) => (
                        <option key={op.value} value={op.value}>
                          {op.label}
                        </option>
                      ))}
                    </select>
                    {!["is_null", "is_not_null"].includes(
                      condition.operator
                    ) && (
                      <Input
                        type="text"
                        value={String(condition.value || "")}
                        onChange={(e) =>
                          handleUpdateCondition(index, "value", e.target.value)
                        }
                        placeholder="Value"
                        className="flex-1"
                      />
                    )}
                    {conditions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCondition(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Actions <span className="text-red-500">*</span>
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddAction}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Action
                </Button>
              </div>
              <div className="space-y-2">
                {actions.map((action, index) => (
                  <div
                    key={index}
                    className="p-3 border border-gray-200 rounded-md space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <select
                        value={action.type}
                        onChange={(e) =>
                          handleUpdateAction(index, "type", e.target.value)
                        }
                        className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                      >
                        {ACTION_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                      {actions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveAction(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {action.type === "assign_agent" && (
                      <Input
                        type="text"
                        placeholder="Agent ID (leave empty for skill-based assignment)"
                        value={String(action.params.agent_id || "")}
                        onChange={(e) =>
                          handleUpdateAction(index, "agent_id", e.target.value)
                        }
                        className="text-sm"
                      />
                    )}

                    {action.type === "set_priority" && (
                      <select
                        value={String(action.params.priority || "medium")}
                        onChange={(e) =>
                          handleUpdateAction(index, "priority", e.target.value)
                        }
                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                      >
                        {PRIORITY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    )}

                    {action.type === "assign_to_bucket" && (
                      <Input
                        type="text"
                        placeholder="Bucket ID"
                        value={String(action.params.bucket_id || "")}
                        onChange={(e) =>
                          handleUpdateAction(index, "bucket_id", e.target.value)
                        }
                        className="text-sm"
                      />
                    )}

                    {action.type === "add_observer" && (
                      <Input
                        type="text"
                        placeholder="User IDs (comma-separated)"
                        value={
                          Array.isArray(action.params.user_ids)
                            ? action.params.user_ids.join(", ")
                            : String(action.params.user_ids || "")
                        }
                        onChange={(e) =>
                          handleUpdateAction(
                            index,
                            "user_ids",
                            e.target.value.split(",").map((id) => id.trim())
                          )
                        }
                        className="text-sm"
                      />
                    )}

                    {action.type === "escalate" && (
                      <div className="space-y-2">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={action.params.increase_priority === true}
                            onChange={(e) =>
                              handleUpdateAction(
                                index,
                                "increase_priority",
                                e.target.checked
                              )
                            }
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <span className="text-sm text-gray-700">
                            Increase Priority
                          </span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={action.params.notify_supervisor === true}
                            onChange={(e) =>
                              handleUpdateAction(
                                index,
                                "notify_supervisor",
                                e.target.checked
                              )
                            }
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <span className="text-sm text-gray-700">
                            Notify Supervisor
                          </span>
                        </label>
                      </div>
                    )}

                    {action.type === "close_ticket" && (
                      <div className="space-y-2">
                        <select
                          value={String(action.params.status || "closed")}
                          onChange={(e) =>
                            handleUpdateAction(index, "status", e.target.value)
                          }
                          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                        >
                          <option value="closed">Closed</option>
                          <option value="resolved">Resolved</option>
                        </select>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={action.params.notify === true}
                            onChange={(e) =>
                              handleUpdateAction(index, "notify", e.target.checked)
                            }
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <span className="text-sm text-gray-700">
                            Notify Customer
                          </span>
                        </label>
                      </div>
                    )}

                    {action.type === "send_notification" && (
                      <div className="space-y-2">
                        <Input
                          type="text"
                          placeholder="Recipients (comma-separated: customer, supervisor, etc.)"
                          value={
                            Array.isArray(action.params.recipients)
                              ? action.params.recipients.join(", ")
                              : String(action.params.recipients || "")
                          }
                          onChange={(e) =>
                            handleUpdateAction(
                              index,
                              "recipients",
                              e.target.value.split(",").map((r) => r.trim())
                            )
                          }
                          className="text-sm"
                        />
                        <Input
                          type="text"
                          placeholder="Template name"
                          value={String(action.params.template || "")}
                          onChange={(e) =>
                            handleUpdateAction(index, "template", e.target.value)
                          }
                          className="text-sm"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isSaving}>
                {rule ? "Update" : "Create"} Automation
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

