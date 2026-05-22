"use client";

import { Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import type { Field } from "@/lib/field-utils";

function FieldInspector({
  selectedField,
  onUpdate,
  onDelete,
}: {
  selectedField?: Field;
  onUpdate: (fieldId: string, updates: Partial<Field>) => void;
  onDelete: (fieldId: string) => void;
}) {
  if (!selectedField) {
    return (
      <div className="flex h-full items-center justify-center border border-dashed border-border bg-muted/20 p-5 text-center font-mono text-[10px] uppercase leading-5 tracking-widest text-muted-foreground">
        Select a field on the document to tune its exact position.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
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
        <Select defaultValue="employee">
          <option value="employee">Employee</option>
          <option value="hr">Any Manager</option>
        </Select>
      </label>
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
      <Button
        variant="destructive"
        className="w-full"
        onClick={() => onDelete(selectedField.id)}
      >
        <Trash2Icon data-icon="inline-start" />
        Delete Field
      </Button>
    </div>
  );
}

export { FieldInspector };
