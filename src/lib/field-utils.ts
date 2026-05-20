export type FieldType = "signature" | "text" | "date" | "checkbox";

export type Field = {
  id: string;
  type: FieldType;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  required: boolean;
};

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

  try {
    return JSON.parse(value.slice(SIGNATURE_VECTOR_PREFIX.length));
  } catch {
    return null;
  }
}

export function valueIsComplete(value?: string) {
  return Boolean(value && value !== "false");
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
