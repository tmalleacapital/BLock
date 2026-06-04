export type FieldType = 'text' | 'rut' | 'email' | 'phone' | 'select' | 'cascade-parent' | 'cascade-child' | 'cascade-auto';

export interface SelectOption {
  value: string;
  label: string;
}

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: SelectOption[];
  helpText?: string;
}

export interface FieldSchema {
  inmobiliaria: string;
  fields: FieldDef[];
}

export interface RunResult {
  status: 'success' | 'error' | 'pending';
  message: string;
  data?: Record<string, unknown>;
}

export interface InmobiliariaAdapter {
  key: string;
  name: string;
  getFieldSchema(): FieldSchema;
  run(ctx: Record<string, unknown>): Promise<RunResult>;
}
