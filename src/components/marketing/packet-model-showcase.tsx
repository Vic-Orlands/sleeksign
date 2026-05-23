import "@xyflow/react/dist/style.css";
import { useState } from "react";
import {
  Handle,
  MarkerType,
  type Edge,
  type Node,
  type NodeProps,
  Position,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import {
  ChevronDown,
  ChevronUp,
  FileStackIcon,
  ShieldCheckIcon,
  UsersRoundIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

type PacketModel = {
  id: string;
  label: string;
  title: string;
  summary: string;
  detail: string;
  helper: string;
  icon: typeof UsersRoundIcon;
  nodes: Node<RelationshipNodeData>[];
  edges: Edge[];
};

type RelationshipNodeData = {
  label: string;
  tone: "document" | "shared" | "private" | "recipient";
  eyebrow?: string;
};

const packetModels: PacketModel[] = [
  {
    id: "collaborative",
    label: "Collaborative packet",
    title: "Everyone signs the same live document.",
    summary:
      "HR, employee, and witness work on one packet, so each completed signature becomes visible inside the same shared agreement.",
    detail:
      "Use this when every collaborator should see the same evolving document state and the final file should close only after the whole chain is done.",
    helper:
      "One packet. One live document. Shared visibility across the signing chain.",
    icon: UsersRoundIcon,
    nodes: [
      {
        id: "collab-hr",
        position: { x: 0, y: 26 },
        data: { label: "HR", eyebrow: "Shared signer", tone: "shared" },
        type: "relationship",
        sourcePosition: Position.Right,
        targetPosition: Position.Right,
      },
      {
        id: "collab-employee",
        position: { x: 0, y: 144 },
        data: { label: "Employee", eyebrow: "Shared signer", tone: "shared" },
        type: "relationship",
        sourcePosition: Position.Right,
        targetPosition: Position.Right,
      },
      {
        id: "collab-witness",
        position: { x: 0, y: 262 },
        data: { label: "Witness", eyebrow: "Shared signer", tone: "shared" },
        type: "relationship",
        sourcePosition: Position.Right,
        targetPosition: Position.Right,
      },
      {
        id: "collab-doc",
        position: { x: 300, y: 144 },
        data: {
          label: "Shared packet",
          eyebrow: "Live document",
          tone: "document",
        },
        type: "relationship",
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      },
      {
        id: "collab-final",
        position: { x: 540, y: 144 },
        data: {
          label: "One finalized PDF",
          eyebrow: "Shared output",
          tone: "recipient",
        },
        type: "relationship",
        sourcePosition: Position.Left,
        targetPosition: Position.Left,
      },
    ],
    edges: [
      edge("collab-hr", "collab-doc", "fills HR fields"),
      edge("collab-employee", "collab-doc", "fills employee fields"),
      edge("collab-witness", "collab-doc", "fills witness fields"),
      edge("collab-doc", "collab-final"),
    ],
  },
  {
    id: "individual",
    label: "Individual copies",
    title: "One template, separate copies for each signer.",
    summary:
      "Every recipient signs their own copy, so nobody sees anyone else’s signature, date, or private form data.",
    detail:
      "Use this for acknowledgements, handbook receipts, tax forms, or any bulk send where each signer should stay fully isolated.",
    helper:
      "One template fans out into separate recipient-owned signing copies.",
    icon: FileStackIcon,
    nodes: [
      {
        id: "ind-template",
        position: { x: 256, y: 148 },
        data: {
          label: "Template document",
          eyebrow: "Reusable source",
          tone: "document",
        },
        type: "relationship",
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      },
      {
        id: "ind-copy-a",
        position: { x: 550, y: 24 },
        data: {
          label: "Employee copy",
          eyebrow: "Private packet",
          tone: "private",
        },
        type: "relationship",
        sourcePosition: Position.Left,
        targetPosition: Position.Left,
      },
      {
        id: "ind-copy-b",
        position: { x: 550, y: 148 },
        data: {
          label: "Contractor copy",
          eyebrow: "Private packet",
          tone: "private",
        },
        type: "relationship",
        sourcePosition: Position.Left,
        targetPosition: Position.Left,
      },
      {
        id: "ind-copy-c",
        position: { x: 550, y: 272 },
        data: {
          label: "Witness copy",
          eyebrow: "Private packet",
          tone: "private",
        },
        type: "relationship",
        sourcePosition: Position.Left,
        targetPosition: Position.Left,
      },
      {
        id: "ind-signers",
        position: { x: 0, y: 148 },
        data: {
          label: "HR sends once",
          eyebrow: "Template owner",
          tone: "shared",
        },
        type: "relationship",
        sourcePosition: Position.Right,
        targetPosition: Position.Right,
      },
    ],
    edges: [
      edge("ind-signers", "ind-template", "shares template"),
      edge("ind-template", "ind-copy-a", "separate copy"),
      edge("ind-template", "ind-copy-b", "separate copy"),
      edge("ind-template", "ind-copy-c", "separate copy"),
    ],
  },
  {
    id: "shared-base",
    label: "Shared-base copies",
    title: "Company signs once, recipients countersign their own copy.",
    summary:
      "The employer or HR signature is shared across every recipient copy, while each employee or contractor only sees their own private signing section.",
    detail:
      "Use this when the company’s sign-off must appear everywhere, but each recipient should only collaborate with the shared company side and not with other recipients.",
    helper: "Shared company layer feeds multiple recipient-specific copies.",
    icon: ShieldCheckIcon,
    nodes: [
      {
        id: "base-shared",
        position: { x: 250, y: 148 },
        data: {
          label: "Shared company layer",
          eyebrow: "HR + employer fields",
          tone: "shared",
        },
        type: "relationship",
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      },
      {
        id: "base-template",
        position: { x: 0, y: 148 },
        data: {
          label: "Packet template",
          eyebrow: "Source document",
          tone: "document",
        },
        type: "relationship",
        sourcePosition: Position.Right,
        targetPosition: Position.Right,
      },
      {
        id: "base-copy-a",
        position: { x: 500, y: 44 },
        data: {
          label: "Employee copy",
          eyebrow: "Private recipient",
          tone: "recipient",
        },
        type: "relationship",
        sourcePosition: Position.Left,
        targetPosition: Position.Left,
      },
      {
        id: "base-copy-b",
        position: { x: 500, y: 252 },
        data: {
          label: "Contractor copy",
          eyebrow: "Private recipient",
          tone: "recipient",
        },
        type: "relationship",
        sourcePosition: Position.Left,
        targetPosition: Position.Left,
      },
      {
        id: "base-third",
        position: { x: 720, y: 252 },
        data: {
          label: "Witness on copy",
          eyebrow: "Optional shared third party",
          tone: "private",
        },
        type: "relationship",
        sourcePosition: Position.Left,
        targetPosition: Position.Left,
      },
    ],
    edges: [
      edge("base-template", "base-shared", "company signs first"),
      edge("base-shared", "base-copy-a", "shared signature appears here"),
      edge("base-shared", "base-copy-b", "shared signature appears here"),
      edge("base-copy-b", "base-third", "optional collaborator on same copy"),
    ],
  },
];

const nodeTypes = {
  relationship: RelationshipNode,
};

function cx(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

export function PacketModelShowcase() {
  const [activeId, setActiveId] = useState(packetModels[0].id);

  const activeModel =
    packetModels.find((model) => model.id === activeId) ?? packetModels[0];

  return (
    <>
      <div className="flex text-center justify-center w-full">
        <div>
          <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-2">
            Relationship graph
          </p>
          <h3 className="text-[18px] font-light text-foreground tracking-tight">
            {activeModel.label}
          </h3>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-16 items-center">
        <div className="w-full lg:w-[18rem] lg:ml-[7%] shrink-0">
          <div className="flex h-full flex-col">
            <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-8">
              Packet models
            </p>
            <div className="flex flex-1 flex-col gap-6 relative">
              <AnimatePresence mode="popLayout">
                {packetModels.map((model) => {
                  const isActive = model.id === activeModel.id;

                  return (
                    <motion.button
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{
                        layout: { type: "spring", bounce: 0, duration: 0.5 },
                        opacity: { duration: 0.3 },
                      }}
                      key={model.id}
                      type="button"
                      onClick={() => setActiveId(model.id)}
                      className={cx(
                        "w-full text-left transition-all duration-300 outline-none",
                        isActive
                          ? "opacity-100"
                          : "opacity-40 hover:opacity-70",
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3
                            className={cx(
                              "text-[15px] transition-colors duration-300",
                              isActive
                                ? "text-foreground font-medium"
                                : "text-foreground font-light",
                            )}
                          >
                            {model.label}
                          </h3>
                        </div>

                        <div className="relative w-4 h-4">
                          <AnimatePresence initial={false} mode="wait">
                            {isActive ? (
                              <motion.div
                                key="up"
                                initial={{ opacity: 0, y: 2 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -2 }}
                                transition={{ duration: 0.2 }}
                              >
                                <ChevronUp className="w-4 h-4 text-muted-foreground" />
                              </motion.div>
                            ) : (
                              <motion.div
                                key="down"
                                initial={{ opacity: 0, y: -2 }}
                                animate={{ opacity: 0.5, y: 0 }}
                                exit={{ opacity: 0, y: 2 }}
                                transition={{ duration: 0.2 }}
                              >
                                <ChevronDown className="w-4 h-4 text-muted-foreground/70" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      <AnimatePresence>
                        {isActive && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="overflow-hidden"
                          >
                            <div className="pt-4">
                              <p className="text-[14px] font-light text-foreground tracking-tight leading-snug">
                                {model.title}
                              </p>
                              <p className="mt-3 text-[12.5px] leading-relaxed text-muted-foreground font-light">
                                {model.summary}
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="flex-1 w-full min-w-0">
          <div className="relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeModel.id}
                initial={{ opacity: 0, filter: "blur(4px)" }}
                animate={{ opacity: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, filter: "blur(4px)" }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0 z-10 pointer-events-none"
              />
            </AnimatePresence>
            <ReactFlowProvider>
              <div className="h-112 w-full">
                <ReactFlow
                  key={activeModel.id}
                  nodes={activeModel.nodes}
                  edges={activeModel.edges}
                  nodeTypes={nodeTypes}
                  fitView
                  fitViewOptions={{ padding: 0.2 }}
                  nodesDraggable={false}
                  nodesConnectable={false}
                  elementsSelectable={false}
                  panOnDrag={false}
                  zoomOnScroll={false}
                  zoomOnPinch={false}
                  zoomOnDoubleClick={false}
                  preventScrolling={false}
                  proOptions={{ hideAttribution: true }}
                ></ReactFlow>
              </div>
            </ReactFlowProvider>
          </div>
        </div>
      </div>
    </>
  );
}

function RelationshipNode({
  data,
  sourcePosition,
  targetPosition,
}: NodeProps<Node<RelationshipNodeData>>) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, type: "spring", bounce: 0.3 }}
      className={cx(
        "relative min-w-[150px] rounded-md border px-3.5 py-2.5 shadow-sm backdrop-blur-sm",
        data.tone === "document" &&
          "border-foreground/20 bg-white/90 text-foreground shadow-md",
        data.tone === "shared" &&
          "border-border/80 bg-stone-50/90 text-foreground",
        data.tone === "private" &&
          "border-amber-200/50 bg-amber-50/90 text-amber-950",
        data.tone === "recipient" &&
          "border-blue-200/50 bg-blue-50/90 text-blue-950",
      )}
    >
      {targetPosition && (
        <Handle
          type="target"
          position={targetPosition}
          className="!w-1.5 !h-1.5 !bg-muted-foreground/30 !border-none"
        />
      )}
      {sourcePosition && (
        <Handle
          type="source"
          position={sourcePosition}
          className="!w-1.5 !h-1.5 !bg-muted-foreground/30 !border-none"
        />
      )}
      {data.eyebrow ? (
        <p className="text-[8.5px] uppercase tracking-[0.16em] opacity-60 font-medium mb-1.5">
          {data.eyebrow}
        </p>
      ) : null}
      <p className="text-[12px] font-medium leading-tight">{data.label}</p>
    </motion.div>
  );
}

function edge(source: string, target: string, label: string): Edge {
  return {
    id: `${source}-${target}`,
    source,
    target,
    label,
    type: "smoothstep",
    animated: true,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 15,
      height: 15,
      color: "#52525b",
    },
    style: {
      stroke: "#52525b",
      strokeWidth: 1.5,
    },
    labelStyle: {
      fill: "#52525b",
      opacity: 0.9,
      fontSize: 9,
      fontWeight: 500,
    },
    labelBgStyle: {
      fill: "var(--background)",
      fillOpacity: 0.8,
      rx: 4,
      ry: 4,
    },
    labelBgPadding: [6, 3],
  };
}
