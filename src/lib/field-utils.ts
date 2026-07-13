export type FieldType = "signature" | "text" | "date" | "checkbox";
export type RoleScope = "shared" | "private";
export type WorkflowMode = "collaborative" | "individual" | "shared-base";
export type RoleConfig = {
  name: string;
  scope: RoleScope;
};

export type Field = {
  id: string;
  type: FieldType;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  required: boolean;
  assigneeRole: string;
};

export const UNASSIGNED_ROLE = "";

export const DEFAULT_SIGNER_ROLES = ["Owner", "Employee", "Contractor"] as const;
export const DEFAULT_ROLE_CONFIGS: RoleConfig[] = DEFAULT_SIGNER_ROLES.map(
  (name) => ({
    name,
    scope: "private",
  }),
);

function canonicalizeRoleName(name: string) {
  return name === "HR" ? "Owner" : name;
}

export function normalizeRoleConfigs(value: unknown) {
  if (!Array.isArray(value)) {
    throw new Error("Role configs must be an array");
  }

  const roleConfigs = value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const name = canonicalizeRoleName(
        String((item as { name?: unknown }).name || "").trim(),
      );
      const scope = (item as { scope?: unknown }).scope === "shared"
        ? "shared"
        : "private";

      if (!name) return null;
      return { name, scope } satisfies RoleConfig;
    })
    .filter((item): item is RoleConfig => Boolean(item))
    .filter(
      (item, index, array) =>
        array.findIndex((entry) => entry.name === item.name) === index,
    );

  if (roleConfigs.length === 0) {
    throw new Error("Role configs must contain at least one role");
  }

  return roleConfigs;
}

export function normalizeSignerRoles(value: unknown) {
  if (!Array.isArray(value)) {
    throw new Error("Signer roles must be an array");
  }

  const roles = value
    .map((item) => canonicalizeRoleName(String(item || "").trim()))
    .filter(Boolean)
    .filter((role, index, array) => array.indexOf(role) === index);

  if (roles.length === 0) {
    throw new Error("Signer roles must contain at least one role");
  }

  return roles;
}

export function parseSignerRoles(value?: string | null) {
  if (!value) {
    throw new Error("Signer roles value is required");
  }

  return normalizeSignerRoles(JSON.parse(value));
}

export function serializeSignerRoles(roles: string[]) {
  return JSON.stringify(normalizeSignerRoles(roles));
}

export function parseRoleConfigs(value?: string | null) {
  if (!value) {
    throw new Error("Role configs value is required");
  }

  return normalizeRoleConfigs(JSON.parse(value));
}

export function serializeRoleConfigs(roleConfigs: RoleConfig[]) {
  return JSON.stringify(normalizeRoleConfigs(roleConfigs));
}

export function deriveSignerRoles(roleConfigs: RoleConfig[]) {
  return normalizeRoleConfigs(roleConfigs).map((role) => role.name);
}

export function areRoleConfigsEqual(
  left: RoleConfig[] | undefined,
  right: RoleConfig[] | undefined,
) {
  if (!left || !right) {
    throw new Error("Both role config arrays are required for comparison");
  }

  const normalizedLeft = normalizeRoleConfigs(left);
  const normalizedRight = normalizeRoleConfigs(right);

  if (normalizedLeft.length !== normalizedRight.length) {
    return false;
  }

  return normalizedLeft.every((role, index) => {
    const comparison = normalizedRight[index];
    return (
      comparison &&
      comparison.name === role.name &&
      comparison.scope === role.scope
    );
  });
}

export function getRoleScope(roleConfigs: RoleConfig[], roleName: string) {
  const role = normalizeRoleConfigs(roleConfigs).find((item) => item.name === roleName);
  if (!role) throw new Error(`Role scope not found for role: ${roleName}`);
  return role.scope;
}

export function getVisibleRoles(
  roleConfigs: RoleConfig[],
  mode: WorkflowMode,
  currentRole: string,
) {
  const normalizedRoleConfigs = normalizeRoleConfigs(roleConfigs);

  if (mode === "collaborative") {
    return normalizedRoleConfigs.map((role) => role.name);
  }

  if (mode === "individual") {
    return [currentRole];
  }

  return normalizedRoleConfigs
    .filter((role) => role.scope === "shared" || role.name === currentRole)
    .map((role) => role.name);
}

export function isSharedRole(
  roleConfigs: RoleConfig[],
  roleName: string,
  mode: WorkflowMode,
) {
  if (mode === "collaborative") return true;
  if (mode === "individual") return false;
  return getRoleScope(roleConfigs, roleName) === "shared";
}

export function getEditableFieldIdsForRole(
  fields: Field[],
  roleName: string,
) {
  return new Set(
    fields
      .filter((field) => field.assigneeRole === roleName)
      .map((field) => field.id),
  );
}

export type SignatureVector = {
  kind: "signature-vector";
  name: string;
  pathData: string;
  viewBox: string;
  width: number;
  height: number;
  fontIndex: number;
};

export const SIGNATURE_VECTOR_PREFIX = "signature-vector:";

export const fieldDefaults: Record<FieldType, { width: number; height: number }> = {
  signature: { width: 28, height: 7 },
  text: { width: 24, height: 5 },
  date: { width: 18, height: 4.5 },
  checkbox: { width: 3.2, height: 3.2 },
};

export function clampField(field: Partial<Field>): Partial<Field> {
  const width = clamp(field.width ?? 20, 1.5, 100);
  const height = clamp(field.height ?? 5, 1.5, 100);
  return {
    ...field,
    width,
    height,
    x: clamp(field.x ?? 0, 0, 100 - width),
    y: clamp(field.y ?? 0, 0, 100 - height),
  };
}

export function encodeSignatureVector(vector: SignatureVector) {
  return `${SIGNATURE_VECTOR_PREFIX}${JSON.stringify(vector)}`;
}

export function decodeSignatureVector(value?: string | null): SignatureVector | null {
  if (!value?.startsWith(SIGNATURE_VECTOR_PREFIX)) return null;
  return JSON.parse(value.slice(SIGNATURE_VECTOR_PREFIX.length));
}

export function valueIsComplete(value?: string) {
  return Boolean(value && value !== "false");
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
