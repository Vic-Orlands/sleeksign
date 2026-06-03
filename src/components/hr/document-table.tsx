"use client";

import { format } from "date-fns";
import { ArchiveIcon, FileTextIcon, RotateCcwIcon, Trash2Icon } from "lucide-react";

import { StatusBadge } from "@/components/hr/status-badge";
import {
  DocumentRecord,
  getDocumentCounts,
  getDocumentSetupStatus,
  getDocumentType,
} from "@/components/hr/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

function DocumentTable({
  documents,
  selectedDocumentId,
  onSelectDocument,
  onDeleteDocument,
  onArchiveDocument,
  onRestoreDocument,
  variant = "documents",
}: {
  documents: DocumentRecord[];
  selectedDocumentId?: string;
  onSelectDocument: (document: DocumentRecord) => void;
  onDeleteDocument?: (document: DocumentRecord) => void;
  onArchiveDocument?: (document: DocumentRecord) => void;
  onRestoreDocument?: (document: DocumentRecord) => void;
  variant?: "documents" | "shared";
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Document Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Fields</TableHead>
          {variant === "shared" ? <TableHead>Signatures</TableHead> : null}
          <TableHead>Last Updated</TableHead>
          {onDeleteDocument || onArchiveDocument || onRestoreDocument ? (
            <TableHead className="w-24 text-right">Actions</TableHead>
          ) : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {documents.map((document) => {
          const counts = getDocumentCounts(document);
          const status =
            variant === "shared"
              ? getSharedStatus(document)
              : getDocumentSetupStatus(document);
          const selected = selectedDocumentId === document.id;

          return (
            <TableRow
              key={document.id}
              data-state={selected ? "selected" : undefined}
              className={cn(
                "cursor-pointer",
                selected && "outline outline-1 outline-primary",
              )}
              tabIndex={0}
              onClick={() => onSelectDocument(document)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ")
                  onSelectDocument(document);
              }}
            >
              <TableCell>
                <div className="flex items-center gap-3">
                  <span className="flex size-7 items-center justify-center border border-border bg-secondary text-red-400">
                    <FileTextIcon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-foreground">
                      {document.name}
                    </p>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      Stored document
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {getDocumentType(document.name)}
              </TableCell>
              <TableCell>
                <StatusBadge status={status} />
              </TableCell>
              <TableCell className="font-mono">{counts.fields}</TableCell>
              {variant === "shared" ? (
                <TableCell className="font-mono text-emerald-400">
                  {counts.completed}/{Math.max(counts.total, 1)}
                </TableCell>
              ) : null}
              <TableCell>
                <div className="font-mono text-[10px]">
                  <p>{format(new Date(document.createdAt), "PP")}</p>
                  <p className="uppercase tracking-widest text-muted-foreground">
                    by Any Admin
                  </p>
                </div>
              </TableCell>
              {onDeleteDocument || onArchiveDocument || onRestoreDocument ? (
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {onRestoreDocument ? (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground"
                        aria-label={`Restore ${document.name}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          onRestoreDocument(document);
                        }}
                      >
                        <RotateCcwIcon />
                      </Button>
                    ) : null}
                    {onArchiveDocument ? (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground"
                        aria-label={`Archive ${document.name}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          onArchiveDocument(document);
                        }}
                      >
                        <ArchiveIcon />
                      </Button>
                    ) : null}
                    {onDeleteDocument ? (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground hover:bg-red-500/10 hover:text-red-300"
                        aria-label={`Delete ${document.name}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          onDeleteDocument(document);
                        }}
                      >
                        <Trash2Icon />
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
              ) : null}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function DocumentTableSkeleton({
  variant = "documents",
  showActions = true,
}: {
  variant?: "documents" | "shared";
  showActions?: boolean;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Document Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Fields</TableHead>
          {variant === "shared" ? <TableHead>Signatures</TableHead> : null}
          <TableHead>Last Updated</TableHead>
          {showActions ? <TableHead className="w-24 text-right">Actions</TableHead> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 5 }).map((_, index) => (
          <TableRow key={index}>
            <TableCell>
              <div className="flex items-center gap-3">
                <Skeleton className="size-7 rounded-none" />
                <div className="min-w-0 space-y-2">
                  <Skeleton className="h-3 w-44 max-w-[42vw]" />
                  <Skeleton className="h-2 w-28" />
                </div>
              </div>
            </TableCell>
            <TableCell>
              <Skeleton className="h-3 w-12" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-6 w-24 rounded-none" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-3 w-8" />
            </TableCell>
            {variant === "shared" ? (
              <TableCell>
                <Skeleton className="h-3 w-10" />
              </TableCell>
            ) : null}
            <TableCell>
              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-2 w-16" />
              </div>
            </TableCell>
            {showActions ? (
              <TableCell>
                <div className="flex justify-end gap-1">
                  <Skeleton className="size-8 rounded-none" />
                  <Skeleton className="size-8 rounded-none" />
                </div>
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function getSharedStatus(document: DocumentRecord) {
  const sessions = document.sessions || [];
  if (sessions.some((session) => session.status === "completed"))
    return "Signed";
  if (sessions.length > 0) return "Opened";
  return "Not Opened";
}

export { DocumentTable, DocumentTableSkeleton };
