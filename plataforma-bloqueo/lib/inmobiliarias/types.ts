export type FieldType = 'text' | 'rut' | 'fecha' | 'email' | 'phone' | 'select' | 'cascade-parent' | 'cascade-child' | 'cascade-auto';

export interface UnidadEntry {
  unidad: string;
  tipologia: string;
}

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
  showWhen?: { field: string; value: string };
  /** Select dependiente: las opciones salen de `options[valor del campo padre]`.
   *  Se deshabilita mientras el padre esté vacío y se limpia si el padre cambia. */
  optionsBy?: { field: string; options: Record<string, SelectOption[]> };
}

export interface FieldGroup {
  label: string;
  keys: string[];
}

export interface FieldSchema {
  inmobiliaria: string;
  fields: FieldDef[];
  /** Agrupamiento de secciones propio de la inmobiliaria. Si se omite, se usa el layout por defecto. */
  groups?: FieldGroup[];
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
