"use client";

import { useState } from "react";
import { Trash2Icon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  UNASSIGNED_ROLE,
  type Field,
  type RoleConfig,
} from "@/lib/field-utils";

function FieldInspector({
  selectedField,
  roleConfigs,
  onUpdate,
  onRoleConfigsChange,
  onDelete,
}: {
  selectedField?: Field;
  roleConfigs: RoleConfig[];
  onUpdate: (fieldId: string, updates: Partial<Field>) => void;
  onRoleConfigsChange: (roleConfigs: RoleConfig[]) => void;
  onDelete: (fieldId: string) => void;
}) {
  const [newSignerRole, setNewSignerRole] = useState("");
  const roleScopeSection = (
    <>
      <div className="grid gap-2">
        <span className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          Role scopes
        </span>
        <div className="grid gap-2">
          {roleConfigs.map((role) => (
            <div
              key={role.name}
              className="grid grid-cols-[minmax(0,1fr)_120px_auto] gap-2"
            >
              <Input value={role.name} readOnly className="font-mono" />
              <Select
                value={role.scope}
                onChange={(event) =>
                  onRoleConfigsChange(
                    roleConfigs.map((entry) =>
                      entry.name === role.name
                        ? {
                            ...entry,
                            scope:
                              event.target.value === "shared"
                                ? "shared"
                                : "private",
                          }
                        : entry,
                    ),
                  )
                }
              >
                <option value="private">Private</option>
                <option value="shared">Shared</option>
              </Select>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove ${role.name} role`}
                onClick={() =>
                  onRoleConfigsChange(
                    roleConfigs.filter((entry) => entry.name !== role.name),
                  )
                }
              >
                <XIcon />
              </Button>
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-2">
        <span className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          Add signer role
        </span>
        <div className="flex gap-2">
          <Input
            value={newSignerRole}
            onChange={(event) => setNewSignerRole(event.target.value)}
            placeholder="Witness"
            className="font-mono"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const role = newSignerRole.trim();
              if (!role) return;
              if (roleConfigs.some((entry) => entry.name === role)) {
                setNewSignerRole("");
                return;
              }
              onRoleConfigsChange([
                ...roleConfigs,
                {
                  name: role,
                  scope: "private",
                },
              ]);
              setNewSignerRole("");
            }}
          >
            Add
          </Button>
        </div>
      </div>
      <p className="border border-border bg-muted/20 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        Shared roles appear across collaborative flows. Private roles stay unique
        per recipient copy.
      </p>
    </>
  );

  return (
    <div className="flex h-full flex-col gap-4">
      {selectedField ? (
        <>
          <div>
            <div className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-widest">
              <span className="size-2 bg-primary" />
              {selectedField.type} Field
            </div>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Page {selectedField.page + 1}
            </p>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              Assigned to
            </span>
            <Select
              value={selectedField.assigneeRole}
              onChange={(event) =>
                onUpdate(selectedField.id, {
                  assigneeRole: event.target.value,
                })
              }
            >
              <option value={UNASSIGNED_ROLE}>Unassigned</option>
              {roleConfigs.map((role) => (
                <option key={role.name} value={role.name}>
                  {role.name}
                </option>
              ))}
            </Select>
          </label>
        </>
      ) : (
        <div className="border border-dashed border-border bg-muted/20 p-5 text-center font-mono text-[10px] uppercase leading-5 tracking-widest text-muted-foreground">
          Select a field to assign it to one of the roles above.
        </div>
      )}
      {selectedField ? (
        <>
          <div className="flex items-center justify-between border border-border bg-muted/20 px-3 py-2">
            <span className="font-mono text-[10px] font-medium uppercase tracking-widest">
              Required
            </span>
            <Switch
              checked={selectedField.required}
              onCheckedChange={(required) =>
                onUpdate(selectedField.id, {
                  required,
                })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(["x", "y", "width", "height"] as const).map((key) => (
              <label key={key} className="flex flex-col gap-1.5">
                <span className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                  {key} (%)
                </span>
                <Input
                  type="number"
                  value={Number(selectedField[key]).toFixed(2)}
                  onChange={(event) =>
                    onUpdate(selectedField.id, {
                      [key]: Number(event.target.value),
                    })
                  }
                  className="font-mono"
                />
              </label>
            ))}
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              Rotation
            </span>
            <Input value="0°" readOnly className="font-mono" />
          </label>
          <Separator />
          {roleScopeSection}
          <div className="mt-auto pt-2">
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => onDelete(selectedField.id)}
            >
              <Trash2Icon data-icon="inline-start" />
              Delete Field
            </Button>
          </div>
        </>
      ) : (
        roleScopeSection
      )}
    </div>
  );
}

export { FieldInspector };
