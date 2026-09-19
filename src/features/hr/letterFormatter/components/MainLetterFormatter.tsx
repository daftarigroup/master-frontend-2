'use client';

import {
  IconAlertCircle,
  IconCheck,
  IconDownload,
  IconEdit,
  IconEye,
  IconFileText,
  IconLoader2,
  IconPlus,
  IconPrinter,
  IconSettings,
  IconTrash,
} from '@tabler/icons-react';
import type { CSSProperties, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useRequireCompanySelected } from '@/features/organization/hooks/useRequireCompanySelected';
import { resolveActAsTenant } from '@/features/organization/utils/actAsTenant';
import { useAppSelector } from '@/store/hook';
import { selectUser } from '@/store/slice/userAccountData';
import { useEmployees } from '../../employee/server/tanstackQuery/useEmployeeQueries';
import {
  useCreateTemplate,
  useDeleteTemplate,
  useFieldValues,
  useLetterTemplates,
  useRenderedLetter,
  useSaveFieldValues,
  useUpdateTemplate,
} from '../server/tanstackQuery/useLetterFormatterQueries';
import type {
  CreateTemplatePayload,
  FieldScope,
  FieldType,
  HrLetterTemplate,
  LetterType,
  TemplateFieldDef,
} from '../types/types';
import { AUTO_MAP_OPTIONS, LETTER_TYPE_LABELS } from '../types/types';

const T = {
  bg: 'var(--background)',
  fg: 'var(--foreground)',
  card: 'var(--card)',
  card2: 'color-mix(in oklch, var(--card) 90%, var(--foreground))',
  muted: 'var(--muted)',
  mutedFg: 'var(--muted-foreground)',
  border: 'var(--border)',
  primary: 'var(--primary)',
  primaryBg: 'color-mix(in oklch, var(--primary) 12%, transparent)',
  primaryFg: 'var(--primary-foreground, #fff)',
  success: 'var(--success)',
  successBg: 'color-mix(in oklch, var(--success) 14%, transparent)',
  warning: 'var(--warning)',
  warningBg: 'color-mix(in oklch, var(--warning) 14%, transparent)',
  danger: 'var(--danger)',
  dangerBg: 'color-mix(in oklch, var(--danger) 14%, transparent)',
  font: "'DM Sans', system-ui, sans-serif" as any,
};

type Tab = 'templates' | 'fields' | 'generate';

const LETTER_TYPES: LetterType[] = ['OFFER', 'EXPERIENCE', 'JOINING'];

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'multiline', label: 'Multi-line' },
  { value: 'date', label: 'Date' },
  { value: 'number', label: 'Number' },
];

// ── small atoms ──────────────────────────────────────────────────────────────

const Btn = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled,
  type = 'button',
  style,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'ghost' | 'danger' | 'outline' | 'secondary';
  size?: 'sm' | 'md';
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  style?: CSSProperties;
}) => {
  const base: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    fontFamily: T.font,
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    border: 'none',
    transition: 'opacity 0.15s',
    padding: size === 'sm' ? '4px 10px' : '8px 16px',
    fontSize: size === 'sm' ? 12 : 13,
  };
  const variants: Record<string, CSSProperties> = {
    primary: { background: T.primary, color: T.primaryFg },
    ghost: { background: 'transparent', color: T.mutedFg },
    danger: { background: T.dangerBg, color: T.danger },
    outline: { background: 'transparent', color: T.fg, border: `1px solid ${T.border}` },
    secondary: { background: 'transparent', color: T.fg, border: `1px solid ${T.border}` },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{ ...base, ...variants[variant], ...style }}
    >
      {children}
    </button>
  );
};

const StyledInput = ({
  id,
  value,
  onChange,
  placeholder,
  as: asProp = 'input',
  rows,
  style,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  as?: 'input' | 'textarea';
  rows?: number;
  style?: CSSProperties;
}) => {
  const base: CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    borderRadius: 8,
    border: `1px solid ${T.border}`,
    background: T.bg,
    color: T.fg,
    fontFamily: T.font,
    fontSize: 13,
    outline: 'none',
    resize: asProp === 'textarea' ? 'vertical' : undefined,
    boxSizing: 'border-box',
    ...style,
  };
  if (asProp === 'textarea') {
    return (
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows ?? 4}
        style={base}
      />
    );
  }
  return (
    <input
      id={id}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={base}
    />
  );
};

const StyledSelect = ({
  id,
  value,
  onChange,
  options,
  style,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  style?: CSSProperties;
}) => (
  <select
    id={id}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    style={{
      padding: '8px 10px',
      borderRadius: 8,
      border: `1px solid ${T.border}`,
      background: T.bg,
      color: T.fg,
      fontFamily: T.font,
      fontSize: 13,
      outline: 'none',
      cursor: 'pointer',
      ...style,
    }}
  >
    {options.map((o) => (
      <option key={o.value} value={o.value}>
        {o.label}
      </option>
    ))}
  </select>
);

const Chip = ({
  label,
  onClick,
  style,
}: {
  label: string;
  onClick?: () => void;
  style?: CSSProperties;
}) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '2px 8px',
      borderRadius: 99,
      background: T.primaryBg,
      color: T.primary,
      fontFamily: T.font,
      fontSize: 11,
      fontWeight: 600,
      border: `1px solid color-mix(in oklch, ${T.primary} 30%, transparent)`,
      cursor: onClick ? 'pointer' : 'default',
      ...style,
    }}
  >
    {label}
  </button>
);

// ── Template Editor ──────────────────────────────────────────────────────────

function TemplateEditor({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial?: HrLetterTemplate;
  onSave: (data: CreateTemplatePayload) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [letterType, setLetterType] = useState<LetterType>(initial?.letterType ?? 'OFFER');
  const [content, setContent] = useState(initial?.content ?? '');
  const [fields, setFields] = useState<TemplateFieldDef[]>(initial?.fields ?? []);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const insertPlaceholder = useCallback((key: string) => {
    const ta = contentRef.current;
    if (!ta) {
      setContent((c) => `${c}{{${key}}}`);
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const snippet = `{{${key}}}`;
    setContent((c) => c.slice(0, start) + snippet + c.slice(end));
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + snippet.length, start + snippet.length);
    }, 0);
  }, []);

  const addField = useCallback(() => {
    setFields((f) => [
      ...f,
      {
        key: `field_${Date.now()}`,
        label: '',
        type: 'text' as FieldType,
        scope: 'global' as FieldScope,
      },
    ]);
  }, []);

  const removeField = useCallback((idx: number) => {
    setFields((f) => f.filter((_, i) => i !== idx));
  }, []);

  const updateField = useCallback((idx: number, patch: Partial<TemplateFieldDef>) => {
    setFields((f) => f.map((field, i) => (i === idx ? { ...field, ...patch } : field)));
  }, []);

  const autoKey = useCallback(
    (label: string) =>
      label
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, ''),
    []
  );

  const handleSave = useCallback(() => {
    if (!name.trim()) {
      toast.error('Template name is required');
      return;
    }
    if (!content.trim()) {
      toast.error('Template content is required');
      return;
    }
    onSave({ name: name.trim(), letterType, content, fields });
  }, [name, letterType, content, fields, onSave]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header row */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <label
            htmlFor="tpl-name"
            style={{
              fontSize: 12,
              color: T.mutedFg,
              fontWeight: 600,
              marginBottom: 4,
              display: 'block',
            }}
          >
            Template Name
          </label>
          <StyledInput
            id="tpl-name"
            value={name}
            onChange={setName}
            placeholder="e.g. Standard Offer Letter"
          />
        </div>
        <div>
          <label
            htmlFor="tpl-type"
            style={{
              fontSize: 12,
              color: T.mutedFg,
              fontWeight: 600,
              marginBottom: 4,
              display: 'block',
            }}
          >
            Letter Type
          </label>
          <StyledSelect
            id="tpl-type"
            value={letterType}
            onChange={(v) => setLetterType(v as LetterType)}
            options={LETTER_TYPES.map((t) => ({ value: t, label: LETTER_TYPE_LABELS[t] }))}
          />
        </div>
      </div>

      {/* Field Definitions */}
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 700, color: T.fg }}>Fields</span>
          <Btn size="sm" onClick={addField}>
            <IconPlus size={13} /> Add Field
          </Btn>
        </div>

        {fields.length === 0 && (
          <p style={{ fontSize: 12, color: T.mutedFg, fontStyle: 'italic' }}>
            No fields yet — add fields to use as {'{{placeholders}}'} in your template.
          </p>
        )}

        {fields.map((field, idx) => (
          <div
            key={field.key}
            className="hrlf-field-row"
            style={{
              border: `1px solid ${T.border}`,
              borderRadius: 10,
              padding: '12px 14px',
              marginBottom: 8,
              background: T.card,
            }}
          >
            <div>
              <label
                htmlFor={`field-label-${idx}`}
                style={{
                  fontSize: 11,
                  color: T.mutedFg,
                  fontWeight: 600,
                  display: 'block',
                  marginBottom: 3,
                }}
              >
                Label
              </label>
              <StyledInput
                id={`field-label-${idx}`}
                value={field.label}
                onChange={(v) => {
                  updateField(idx, {
                    label: v,
                    key: field.key.startsWith('field_') ? autoKey(v) || field.key : field.key,
                  });
                }}
                placeholder="e.g. Company Name"
                style={{ fontSize: 12 }}
              />
              <span style={{ fontSize: 10, color: T.mutedFg, marginTop: 2, display: 'block' }}>
                Placeholder: {'{{'}
                {field.key}
                {'}}'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <label htmlFor={`field-type-${idx}`} style={{ display: 'none' }}>
                  Type
                </label>
                <StyledSelect
                  id={`field-type-${idx}`}
                  value={field.type}
                  onChange={(v) => updateField(idx, { type: v as FieldType })}
                  options={FIELD_TYPES}
                  style={{ fontSize: 12, flex: 1 }}
                />
                <label htmlFor={`field-scope-${idx}`} style={{ display: 'none' }}>
                  Scope
                </label>
                <StyledSelect
                  id={`field-scope-${idx}`}
                  value={field.scope}
                  onChange={(v) => updateField(idx, { scope: v as FieldScope })}
                  options={[
                    { value: 'global', label: 'Global' },
                    { value: 'employee', label: 'Per-employee' },
                  ]}
                  style={{ fontSize: 12, flex: 1 }}
                />
              </div>
              <label htmlFor={`field-automap-${idx}`} style={{ display: 'none' }}>
                Auto-map
              </label>
              <select
                id={`field-automap-${idx}`}
                value={field.autoMap ?? ''}
                onChange={(e) => updateField(idx, { autoMap: e.target.value || undefined })}
                style={{
                  padding: '5px 8px',
                  borderRadius: 8,
                  border: `1px solid ${T.border}`,
                  background: T.bg,
                  color: field.autoMap ? T.fg : T.mutedFg,
                  fontFamily: T.font,
                  fontSize: 12,
                  outline: 'none',
                }}
              >
                <option value="">— Auto-map from employee (optional) —</option>
                {AUTO_MAP_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 18 }}>
              <Btn
                size="sm"
                variant="ghost"
                onClick={() => insertPlaceholder(field.key)}
                style={{ fontSize: 11 }}
              >
                Insert
              </Btn>
              <Btn size="sm" variant="danger" onClick={() => removeField(idx)}>
                <IconTrash size={11} />
              </Btn>
            </div>
          </div>
        ))}
      </div>

      {/* Content editor */}
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 6,
          }}
        >
          <label htmlFor="tpl-content" style={{ fontSize: 13, fontWeight: 700, color: T.fg }}>
            Letter Content (HTML)
          </label>
          {fields.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {fields.map((f) => (
                <Chip key={f.key} label={`{{${f.key}}}`} onClick={() => insertPlaceholder(f.key)} />
              ))}
            </div>
          )}
        </div>
        <textarea
          id="tpl-content"
          ref={contentRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={`<p>Dear <strong>{{employee_name}}</strong>,</p>\n<p>We are pleased to offer you the position of <strong>{{designation}}</strong>...</p>`}
          rows={14}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 8,
            border: `1px solid ${T.border}`,
            background: T.bg,
            color: T.fg,
            fontFamily: 'monospace',
            fontSize: 12,
            outline: 'none',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />
        <p style={{ fontSize: 11, color: T.mutedFg, marginTop: 4 }}>
          Use HTML tags for formatting. Insert placeholders by clicking the field chips above or
          typing {'{{field_key}}'}.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
        <Btn variant="outline" onClick={onCancel}>
          Cancel
        </Btn>
        <Btn onClick={handleSave} disabled={saving}>
          {saving ? (
            <IconLoader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <IconCheck size={14} />
          )}
          {initial ? 'Update Template' : 'Create Template'}
        </Btn>
      </div>
    </div>
  );
}

// ── Field Values Editor ──────────────────────────────────────────────────────

function FieldValuesEditor({
  template,
  employeeId,
}: {
  template: HrLetterTemplate;
  employeeId?: string;
}) {
  const user = useAppSelector(selectUser);
  const actAsTenantId = resolveActAsTenant(template.tenant, user?.tenantId);
  const { data: storedValues = [], isLoading } = useFieldValues(
    template.id,
    employeeId,
    actAsTenantId
  );
  const saveMut = useSaveFieldValues();

  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (isLoading || initialized) return;
    const map: Record<string, string> = {};
    for (const fv of storedValues) {
      if (fv.employeeId === (employeeId ?? '')) {
        map[fv.fieldKey] = fv.value;
      } else if (fv.employeeId === '' && !map[fv.fieldKey]) {
        map[fv.fieldKey] = fv.value;
      }
    }
    setLocalValues(map);
    setInitialized(true);
  }, [storedValues, isLoading, initialized, employeeId]);

  const scopedFields = template.fields.filter((f) =>
    employeeId ? f.scope === 'employee' : f.scope === 'global'
  );

  const handleSave = useCallback(() => {
    const entries = scopedFields
      .filter((f) => !f.autoMap)
      .map((f) => ({
        fieldKey: f.key,
        value: localValues[f.key] ?? '',
        employeeId,
      }));
    saveMut.mutate(
      { templateId: template.id, payload: { entries }, actAsTenantId },
      {
        onSuccess: () => toast.success('Field values saved'),
        onError: () => toast.error('Failed to save'),
      }
    );
  }, [scopedFields, localValues, saveMut, template.id, employeeId, actAsTenantId]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
        <IconLoader2 size={20} style={{ animation: 'spin 1s linear infinite', color: T.primary }} />
      </div>
    );
  }

  if (scopedFields.length === 0) {
    return (
      <p style={{ fontSize: 13, color: T.mutedFg, fontStyle: 'italic', padding: '12px 0' }}>
        No {employeeId ? 'per-employee' : 'global'} fields defined for this template.
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {scopedFields.map((field) => (
        <div key={field.key}>
          <label
            htmlFor={`fv-${field.key}`}
            style={{
              fontSize: 12,
              color: T.mutedFg,
              fontWeight: 600,
              display: 'block',
              marginBottom: 4,
            }}
          >
            {field.label}
            {field.autoMap && (
              <span style={{ marginLeft: 6, fontSize: 10, color: T.primary }}>
                (auto: {field.autoMap})
              </span>
            )}
          </label>
          {field.autoMap ? (
            <p style={{ fontSize: 12, color: T.mutedFg, fontStyle: 'italic', margin: 0 }}>
              Auto-filled from employee record — no manual entry needed.
            </p>
          ) : (
            <StyledInput
              id={`fv-${field.key}`}
              as={field.type === 'multiline' ? 'textarea' : 'input'}
              value={localValues[field.key] ?? ''}
              onChange={(v) => setLocalValues((prev) => ({ ...prev, [field.key]: v }))}
              placeholder={`Enter ${field.label.toLowerCase()}...`}
              rows={3}
            />
          )}
        </div>
      ))}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
        <Btn onClick={handleSave} disabled={saveMut.isPending}>
          {saveMut.isPending ? (
            <IconLoader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <IconCheck size={14} />
          )}
          Save Values
        </Btn>
      </div>
    </div>
  );
}

// ── Generate & Preview ───────────────────────────────────────────────────────

function GeneratePanel({ templates }: { templates: HrLetterTemplate[] }) {
  const [selectedTemplateId, setSelectedTemplateId] = useState(0);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  const user = useAppSelector(selectUser);
  const { data: employees = [] } = useEmployees();

  // The template is the resource actually being read (render validates the
  // employee against the SAME tenant as the template) — resolve act-as from it.
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
  const actAsTenantId = resolveActAsTenant(selectedTemplate?.tenant, user?.tenantId);

  const {
    data: rendered,
    isLoading,
    error,
  } = useRenderedLetter(selectedTemplateId, selectedEmployeeId, actAsTenantId);

  const rawPreviewHtml: string = rendered?.html || (rendered as any)?.renderedHtml || '';
  const previewEmpName =
    rendered?.employeeName ||
    (rendered as any)?.tokensReplaced?.employeeName ||
    (rendered as any)?.tokensReplaced?.name ||
    employees.find((e) => e.employeeId === selectedEmployeeId)?.name ||
    '';

  const processedPreviewHtml = useMemo(() => {
    if (!rawPreviewHtml) return '';

    const emp = employees.find((e) => e.employeeId === selectedEmployeeId);
    if (!emp && !rawPreviewHtml.includes('{{')) return rawPreviewHtml;

    const todayStr = new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const joiningStr = emp?.joiningDate
      ? new Date(emp.joiningDate).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : todayStr;

    const norm = (s: string) => s.toLowerCase().replace(/[\s_\-]+/g, '');

    const fallbackMap: Record<string, string> = {
      employeename: emp?.name || '',
      candidatename: emp?.name || '',
      name: emp?.name || '',
      designation: emp?.designation || '',
      department: emp?.department?.name || '',
      joiningdate: joiningStr,
      worklocation: emp?.workLocation || '',
      reportingto: emp?.managerName || '',
      reportingmanager: emp?.managerName || '',
      managername: emp?.managerName || '',
      offerdate: todayStr,
      todaydate: todayStr,
      date: todayStr,
      botivate: 'Botivate Services LLP',
      companyname: 'Botivate Services LLP',
      empcode: emp?.empCode || emp?.employeeId || '',
    };

    return (rawPreviewHtml as string).replace(/\{\{\s*([^}]+)\s*\}\}/g, (match: string, key: string) => {
      const k = norm(key);
      if (fallbackMap[k]) return fallbackMap[k];
      return match;
    });
  }, [rawPreviewHtml, employees, selectedEmployeeId]);

  const previewHtml = processedPreviewHtml;

  const [downloading, setDownloading] = useState(false);

  const handleDownload = useCallback(async () => {
    if (!rendered || !printRef.current) return;
    setDownloading(true);
    let iframe: HTMLIFrameElement | null = null;
    try {
      const jspdfModule = await import('jspdf');
      const JsPDF =
        jspdfModule.jsPDF ||
        (jspdfModule as any).default?.jsPDF ||
        (jspdfModule as any).default;

      if (!JsPDF || typeof JsPDF !== 'function') {
        throw new Error('jsPDF library could not be loaded as a constructor');
      }

      const html2canvasModule = await import('html2canvas');
      const html2canvas = html2canvasModule.default || html2canvasModule;

      if (!html2canvas || typeof html2canvas !== 'function') {
        throw new Error('html2canvas library could not be loaded');
      }

      // Create an isolated hidden iframe for html2canvas to render into.
      // This isolates html2canvas completely from the parent document's Tailwind CSS v4 variables
      // (e.g. oklch() color functions which html2canvas cannot parse).
      iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.left = '-9999px';
      iframe.style.top = '0';
      iframe.style.width = '794px'; // Standard A4 width in px at 96 DPI
      iframe.style.minHeight = '1123px';
      iframe.style.border = 'none';
      iframe.style.backgroundColor = '#ffffff';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) throw new Error('Could not access print frame document');

      const isHtml =
        previewHtml.includes('<p') ||
        previewHtml.includes('<div') ||
        previewHtml.includes('<table') ||
        previewHtml.includes('<br');

      const tpl = templates.find((t) => t.id === selectedTemplateId);
      const safeName = (previewEmpName || 'letter').replace(/[^a-zA-Z0-9_-]/g, '_');

      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>${tpl?.name || 'Letter'}</title>
            <style>
              @page {
                size: A4 portrait;
                margin: 12mm 15mm 12mm 15mm;
              }
              *, *::before, *::after {
                box-sizing: border-box;
              }
              html, body {
                margin: 0;
                padding: 0;
                background-color: #ffffff;
                color: #111111;
                font-family: Arial, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                font-size: 13px;
                line-height: 1.55;
                -webkit-font-smoothing: antialiased;
              }
              #letter-page-container {
                width: 794px;
                margin: 0 auto;
                padding: 36px 44px;
                background-color: #ffffff;
                white-space: ${isHtml ? 'normal' : 'pre-wrap'};
                word-wrap: break-word;
              }
              table {
                border-collapse: collapse;
                width: 100%;
                margin: 12px 0;
                page-break-inside: avoid;
                break-inside: avoid;
              }
              tr, td, th {
                page-break-inside: avoid;
                break-inside: avoid;
              }
              th, td {
                border: 1px solid #d1d5db;
                padding: 7px 11px;
                text-align: left;
                font-size: 12.5px;
              }
              th {
                background-color: #f9fafb;
                font-weight: 600;
              }
              p {
                margin: 0 0 8px 0;
                page-break-inside: avoid;
                break-inside: avoid;
              }
              .page-break-avoid, .signature-block {
                page-break-inside: avoid;
                break-inside: avoid;
              }
            </style>
          </head>
          <body>
            <div id="letter-page-container">
              ${printRef.current.innerHTML}
            </div>
          </body>
        </html>
      `);
      iframeDoc.close();

      // Wait a short moment to ensure iframe DOM and fonts are ready
      await new Promise((resolve) => setTimeout(resolve, 300));

      const letterContainer = iframeDoc.getElementById('letter-page-container') || iframeDoc.body;

      const canvas = await html2canvas(letterContainer, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 794,
      });

      const pdf = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth(); // 210 mm
      const pageH = pdf.internal.pageSize.getHeight(); // 297 mm

      // Height of one A4 page in canvas pixel space (scale = 2)
      const pageCanvasH = canvas.width * (pageH / pageW);

      if (canvas.height <= pageCanvasH) {
        // Entire letter fits comfortably on a single A4 page
        const imgH = (canvas.height / canvas.width) * pageW;
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pageW, imgH);
      } else {
        // Multi-page: smart slicing at paragraph/row boundaries to avoid cutting across text/tables
        const containerRect = letterContainer.getBoundingClientRect();
        const breakElements = Array.from(
          letterContainer.querySelectorAll('p, tr, table, h1, h2, h3, h4, div, .page-break-avoid')
        ) as HTMLElement[];

        const breakPoints: number[] = [];
        for (const el of breakElements) {
          const rect = el.getBoundingClientRect();
          const topInCanvas = (rect.top - containerRect.top) * 2;
          const bottomInCanvas = (rect.bottom - containerRect.top) * 2;
          if (topInCanvas > 50 && topInCanvas < canvas.height - 50) {
            breakPoints.push(Math.round(topInCanvas));
          }
          if (bottomInCanvas > 50 && bottomInCanvas < canvas.height - 50) {
            breakPoints.push(Math.round(bottomInCanvas));
          }
        }
        const sortedBreaks = Array.from(new Set(breakPoints)).sort((a, b) => a - b);

        let currentY = 0;
        let pageCount = 0;

        while (currentY < canvas.height) {
          if (pageCount > 0) pdf.addPage();
          pageCount++;

          const remainingCanvasH = canvas.height - currentY;
          if (remainingCanvasH <= pageCanvasH) {
            // Remaining fits on this last page
            const sliceCanvas = document.createElement('canvas');
            sliceCanvas.width = canvas.width;
            sliceCanvas.height = remainingCanvasH;
            const ctx = sliceCanvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(
                canvas,
                0,
                currentY,
                canvas.width,
                remainingCanvasH,
                0,
                0,
                canvas.width,
                remainingCanvasH
              );
            }
            const sliceH = (remainingCanvasH / canvas.width) * pageW;
            pdf.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', 0, 0, pageW, sliceH);
            break;
          }

          // Find candidate clean boundary in [currentY + 0.75 * pageCanvasH, currentY + pageCanvasH]
          const maxCutY = currentY + pageCanvasH;
          const minCutY = currentY + pageCanvasH * 0.72;
          let bestCutY = maxCutY;

          const validBreaks = sortedBreaks.filter((bp) => bp >= minCutY && bp <= maxCutY);
          if (validBreaks.length > 0) {
            bestCutY = validBreaks[validBreaks.length - 1];
          }

          const sliceH = bestCutY - currentY;
          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = sliceH;
          const ctx = sliceCanvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(
              canvas,
              0,
              currentY,
              canvas.width,
              sliceH,
              0,
              0,
              canvas.width,
              sliceH
            );
          }
          const pdfSliceH = (sliceH / canvas.width) * pageW;
          pdf.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', 0, 0, pageW, pdfSliceH);
          currentY = bestCutY;
        }
      }

      pdf.save(`${tpl?.letterType ?? 'letter'}_${safeName}.pdf`);
      toast.success('PDF downloaded successfully');
    } catch (_err) {
      console.error('Failed to generate PDF:', _err);
      const msg = _err instanceof Error ? _err.message : 'Failed to generate PDF';
      toast.error(msg);
    } finally {
      if (iframe && iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
      setDownloading(false);
    }
  }, [rendered, templates, selectedTemplateId, previewEmpName, previewHtml]);

  const handlePrint = useCallback(() => {
    if (!printRef.current) return;
    const isHtml =
      previewHtml.includes('<p') ||
      previewHtml.includes('<div') ||
      previewHtml.includes('<table') ||
      previewHtml.includes('<br');
    const tpl = templates.find((t) => t.id === selectedTemplateId);
    const title = `${tpl?.name || 'Letter'} - ${previewEmpName || 'Document'}`;

    const printIframe = document.createElement('iframe');
    printIframe.style.position = 'fixed';
    printIframe.style.left = '-9999px';
    printIframe.style.top = '0';
    printIframe.style.width = '794px';
    printIframe.style.border = 'none';
    document.body.appendChild(printIframe);

    const doc = printIframe.contentDocument || printIframe.contentWindow?.document;
    if (!doc) {
      toast.error('Could not prepare print document');
      return;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title></title>
          <style>
            @page {
              size: A4 portrait;
              margin: 0;
            }
            *, *::before, *::after {
              box-sizing: border-box;
            }
            html, body {
              margin: 0;
              padding: 0;
              background-color: #ffffff;
            }
            body {
              padding: 14mm 16mm;
              color: #111111;
              font-family: Arial, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              font-size: 13px;
              line-height: 1.55;
              -webkit-font-smoothing: antialiased;
              white-space: ${isHtml ? 'normal' : 'pre-wrap'};
            }
            table {
              border-collapse: collapse;
              width: 100%;
              margin: 12px 0;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            tr, td, th {
              page-break-inside: avoid;
              break-inside: avoid;
            }
            th, td {
              border: 1px solid #d1d5db;
              padding: 7px 11px;
              text-align: left;
              font-size: 12.5px;
            }
            th {
              background-color: #f9fafb;
              font-weight: 600;
            }
            p {
              margin: 0 0 8px 0;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .page-break-avoid, .signature-block {
              page-break-inside: avoid;
              break-inside: avoid;
            }
          </style>
        </head>
        <body>
          ${printRef.current.innerHTML}
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      printIframe.contentWindow?.focus();
      printIframe.contentWindow?.print();
      setTimeout(() => {
        if (printIframe.parentNode) printIframe.parentNode.removeChild(printIframe);
      }, 3000);
    }, 400);
  }, [previewHtml, templates, selectedTemplateId, previewEmpName]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label
            htmlFor="gen-tpl"
            style={{
              fontSize: 12,
              color: T.mutedFg,
              fontWeight: 600,
              display: 'block',
              marginBottom: 4,
            }}
          >
            Template
          </label>
          <StyledSelect
            id="gen-tpl"
            value={String(selectedTemplateId)}
            onChange={(v) => setSelectedTemplateId(Number(v))}
            options={[
              { value: '0', label: '— Select template —' },
              ...templates.map((t) => ({
                value: String(t.id),
                label: `${LETTER_TYPE_LABELS[t.letterType]} — ${t.name}`,
              })),
            ]}
            style={{ minWidth: 260 }}
          />
        </div>
        <div>
          <label
            htmlFor="gen-emp"
            style={{
              fontSize: 12,
              color: T.mutedFg,
              fontWeight: 600,
              display: 'block',
              marginBottom: 4,
            }}
          >
            Employee
          </label>
          <StyledSelect
            id="gen-emp"
            value={selectedEmployeeId}
            onChange={setSelectedEmployeeId}
            options={[
              { value: '', label: '— Select employee —' },
              ...employees.map((e) => ({
                value: e.employeeId,
                label: `${e.name}${e.designation ? ` · ${e.designation}` : ''}`,
              })),
            ]}
            style={{ minWidth: 240 }}
          />
        </div>
        {/* <Btn onClick={handleDownload} disabled={!rendered || downloading}>
          {downloading ? (
            <IconLoader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <IconDownload size={14} />
          )}
          {downloading ? 'Generating PDF…' : 'Download PDF'}
        </Btn> */}
        <Btn variant="outline" onClick={handlePrint} disabled={!rendered}>
          <IconPrinter size={14} /> Print / Save PDF
        </Btn>
      </div>

      {isLoading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <IconLoader2
            size={24}
            style={{ animation: 'spin 1s linear infinite', color: T.primary }}
          />
        </div>
      )}

      {error && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            color: T.danger,
            padding: 12,
            background: T.dangerBg,
            borderRadius: 10,
          }}
        >
          <IconAlertCircle size={16} />
          <span style={{ fontSize: 13 }}>
            Failed to render letter. Ensure all required field values are configured.
          </span>
        </div>
      )}

      {rendered && (
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 10,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: T.fg }}>
              Preview — {previewEmpName}
            </span>
          </div>
          <div
            className="hrlf-preview-pad"
            style={{
              border: `1px solid ${T.border}`,
              borderRadius: 10,
              overflow: 'auto',
              background: '#ffffff',
              minHeight: 400,
            }}
          >
            <div
              ref={printRef}
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: 14,
                lineHeight: 1.7,
                color: '#111',
                maxWidth: 680,
                margin: '0 auto',
                whiteSpace:
                  previewHtml.includes('<p') ||
                  previewHtml.includes('<div') ||
                  previewHtml.includes('<br') ||
                  previewHtml.includes('<table')
                    ? 'normal'
                    : 'pre-wrap',
              }}
              // biome-ignore lint/security/noDangerouslySetInnerHtml: template HTML from own server
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        </div>
      )}

      {!rendered && !isLoading && selectedTemplateId > 0 && selectedEmployeeId && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            color: T.mutedFg,
            padding: 16,
            background: T.card,
            borderRadius: 10,
          }}
        >
          <IconEye size={16} />
          <span style={{ fontSize: 13 }}>
            Preview will appear here once the letter is rendered.
          </span>
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function MainLetterFormatter() {
  // Guards the "Create Template" flow only (below) — update/delete resolve
  // their own target company inline via resolveActAsTenant.
  const requireCompanySelected = useRequireCompanySelected();
  const user = useAppSelector(selectUser);
  const [tab, setTab] = useState<Tab>('templates');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [fieldTab, setFieldTab] = useState<'global' | 'employee'>('global');
  const [fieldEmployee, setFieldEmployee] = useState('');

  const { data: templates = [], isLoading } = useLetterTemplates();
  const { data: employees = [] } = useEmployees();
  const createMut = useCreateTemplate();
  const updateMut = useUpdateTemplate();
  const deleteMut = useDeleteTemplate();

  const selected = templates.find((t) => t.id === selectedId) ?? null;

  const handleCreate = useCallback(
    (data: CreateTemplatePayload) => {
      if (!requireCompanySelected()) return;
      createMut.mutate(data, {
        onSuccess: (tpl) => {
          toast.success('Template created');
          setCreating(false);
          setSelectedId(tpl.id);
        },
        onError: () => toast.error('Failed to create template'),
      });
    },
    [createMut, requireCompanySelected]
  );

  const handleUpdate = useCallback(
    (data: CreateTemplatePayload) => {
      if (!selectedId) return;
      const actAsTenantId = resolveActAsTenant(selected?.tenant, user?.tenantId);
      updateMut.mutate(
        { id: selectedId, payload: data, actAsTenantId },
        {
          onSuccess: () => {
            toast.success('Template updated');
            setEditing(false);
          },
          onError: () => toast.error('Failed to update template'),
        }
      );
    },
    [selectedId, selected?.tenant, user?.tenantId, updateMut]
  );

  const handleDelete = useCallback(
    (id: number) => {
      if (!confirm('Delete this template?')) return;
      const row = templates.find((t) => t.id === id);
      const actAsTenantId = resolveActAsTenant(row?.tenant, user?.tenantId);
      deleteMut.mutate(
        { id, actAsTenantId },
        {
          onSuccess: () => {
            toast.success('Template deleted');
            if (selectedId === id) setSelectedId(null);
          },
          onError: () => toast.error('Failed to delete'),
        }
      );
    },
    [deleteMut, selectedId, templates, user?.tenantId]
  );

  const grouped = LETTER_TYPES.map((lt) => ({
    type: lt,
    items: templates.filter((t) => t.letterType === lt),
  }));

  return (
    <div style={{ fontFamily: T.font, color: T.fg, minHeight: '100vh', background: T.bg }}>
      {/* Page header */}
      <div className="hrlf-page-padding" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: T.primaryBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconFileText size={18} color={T.primary} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Letter Formatter</h1>
            <p style={{ margin: 0, fontSize: 12, color: T.mutedFg }}>
              Design and manage offer, experience & joining letter templates
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            gap: 4,
            marginTop: 20,
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          {(
            [
              { key: 'templates', label: 'Templates', icon: <IconFileText size={14} /> },
              { key: 'fields', label: 'Field Values', icon: <IconSettings size={14} /> },
              {
                key: 'generate',
                label: 'Generate & Download',
                icon: <IconDownload size={14} />,
              },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                border: 'none',
                borderBottom: tab === t.key ? `2px solid ${T.primary}` : '2px solid transparent',
                background: 'transparent',
                color: tab === t.key ? T.primary : T.mutedFg,
                fontFamily: T.font,
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                marginBottom: -1,
                transition: 'color 0.15s',
              }}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="hrlf-content-padding">
        {/* ── Templates Tab ── */}
        {tab === 'templates' && (
          <div className="hrlf-templates-grid">
            {/* Sidebar */}
            <div
              style={{
                border: `1px solid ${T.border}`,
                borderRadius: 12,
                background: T.card,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '12px 14px',
                  borderBottom: `1px solid ${T.border}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: T.mutedFg,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Templates
                </span>
                <Btn
                  size="sm"
                  onClick={() => {
                    if (!requireCompanySelected()) return;
                    setCreating(true);
                    setEditing(false);
                    setSelectedId(null);
                  }}
                >
                  <IconPlus size={12} /> New
                </Btn>
              </div>

              {isLoading ? (
                <div style={{ padding: 20, display: 'flex', justifyContent: 'center' }}>
                  <IconLoader2
                    size={18}
                    style={{ animation: 'spin 1s linear infinite', color: T.primary }}
                  />
                </div>
              ) : (
                grouped.map(({ type, items }) => (
                  <div key={type}>
                    <div
                      style={{
                        padding: '6px 14px',
                        fontSize: 11,
                        fontWeight: 700,
                        color: T.mutedFg,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        background: T.card2,
                      }}
                    >
                      {LETTER_TYPE_LABELS[type]}
                    </div>
                    {items.length === 0 && (
                      <p
                        style={{
                          fontSize: 11,
                          color: T.mutedFg,
                          padding: '6px 14px',
                          margin: 0,
                          fontStyle: 'italic',
                        }}
                      >
                        None yet
                      </p>
                    )}
                    {items.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setSelectedId(t.id);
                          setCreating(false);
                          setEditing(false);
                        }}
                        style={{
                          width: '100%',
                          padding: '8px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          background: selectedId === t.id ? T.primaryBg : 'transparent',
                          border: 'none',
                          textAlign: 'left',
                          cursor: 'pointer',
                          color: selectedId === t.id ? T.primary : T.fg,
                          fontFamily: T.font,
                          fontSize: 13,
                          fontWeight: selectedId === t.id ? 600 : 400,
                          borderLeft: `3px solid ${selectedId === t.id ? T.primary : 'transparent'}`,
                          transition: 'all 0.1s',
                        }}
                      >
                        <IconFileText size={14} />
                        <span
                          style={{
                            flex: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {t.name}
                        </span>
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>

            {/* Main panel */}
            <div
              style={{
                border: `1px solid ${T.border}`,
                borderRadius: 12,
                background: T.card,
                padding: 20,
                minHeight: 400,
              }}
            >
              {creating && (
                <TemplateEditor
                  onSave={handleCreate}
                  onCancel={() => setCreating(false)}
                  saving={createMut.isPending}
                />
              )}

              {!creating && selected && editing && (
                <TemplateEditor
                  initial={selected}
                  onSave={handleUpdate}
                  onCancel={() => setEditing(false)}
                  saving={updateMut.isPending}
                />
              )}

              {!creating && selected && !editing && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                    }}
                  >
                    <div>
                      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{selected.name}</h2>
                      <Chip
                        label={LETTER_TYPE_LABELS[selected.letterType]}
                        style={{ marginTop: 4 }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Btn size="sm" variant="outline" onClick={() => setEditing(true)}>
                        <IconEdit size={13} /> Edit
                      </Btn>
                      <Btn
                        size="sm"
                        variant="danger"
                        onClick={() => handleDelete(selected.id)}
                        disabled={deleteMut.isPending}
                      >
                        <IconTrash size={13} /> Delete
                      </Btn>
                    </div>
                  </div>

                  <div>
                    <p
                      style={{
                        margin: '0 0 8px',
                        fontSize: 13,
                        fontWeight: 600,
                        color: T.fg,
                      }}
                    >
                      Fields ({selected.fields.length})
                    </p>
                    {selected.fields.length === 0 ? (
                      <p style={{ fontSize: 12, color: T.mutedFg, fontStyle: 'italic' }}>
                        No fields defined.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {selected.fields.map((f) => (
                          <div
                            key={f.key}
                            style={{
                              padding: '4px 10px',
                              borderRadius: 8,
                              border: `1px solid ${T.border}`,
                              background: f.scope === 'global' ? T.primaryBg : T.warningBg,
                              fontSize: 11,
                              fontWeight: 600,
                              color: f.scope === 'global' ? T.primary : T.warning,
                            }}
                          >
                            {'{{'}
                            {f.key}
                            {'}}'}
                            <span style={{ opacity: 0.7, marginLeft: 4 }}>
                              · {f.scope}
                              {f.autoMap ? ` · auto:${f.autoMap}` : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <p
                      style={{
                        margin: '0 0 8px',
                        fontSize: 13,
                        fontWeight: 600,
                        color: T.fg,
                      }}
                    >
                      Content Preview
                    </p>
                    <div
                      style={{
                        border: `1px solid ${T.border}`,
                        borderRadius: 8,
                        padding: '12px 14px',
                        background: T.bg,
                        maxHeight: 300,
                        overflow: 'auto',
                        fontSize: 12,
                        lineHeight: 1.6,
                      }}
                      // biome-ignore lint/security/noDangerouslySetInnerHtml: template preview from own server
                      dangerouslySetInnerHTML={{ __html: selected.content }}
                    />
                  </div>
                </div>
              )}

              {!creating && !selected && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: 300,
                    gap: 12,
                    color: T.mutedFg,
                  }}
                >
                  <IconFileText size={40} style={{ opacity: 0.3 }} />
                  <p style={{ margin: 0, fontSize: 14 }}>Select a template or create a new one</p>
                  <Btn
                    onClick={() => {
                      if (!requireCompanySelected()) return;
                      setCreating(true);
                    }}
                  >
                    <IconPlus size={14} /> New Template
                  </Btn>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Field Values Tab ── */}
        {tab === 'fields' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div
              style={{
                display: 'flex',
                gap: 12,
                alignItems: 'flex-end',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <label
                  htmlFor="fv-template"
                  style={{
                    fontSize: 12,
                    color: T.mutedFg,
                    fontWeight: 600,
                    display: 'block',
                    marginBottom: 4,
                  }}
                >
                  Template
                </label>
                <StyledSelect
                  id="fv-template"
                  value={String(selectedId ?? 0)}
                  onChange={(v) => setSelectedId(Number(v) || null)}
                  options={[
                    { value: '0', label: '— Select template —' },
                    ...templates.map((t) => ({
                      value: String(t.id),
                      label: `${LETTER_TYPE_LABELS[t.letterType]} — ${t.name}`,
                    })),
                  ]}
                  style={{ minWidth: 280 }}
                />
              </div>

              {selected && (
                <div style={{ display: 'flex', gap: 4 }}>
                  {(['global', 'employee'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setFieldTab(s)}
                      style={{
                        padding: '7px 14px',
                        borderRadius: 8,
                        border: `1px solid ${fieldTab === s ? T.primary : T.border}`,
                        background: fieldTab === s ? T.primaryBg : 'transparent',
                        color: fieldTab === s ? T.primary : T.mutedFg,
                        fontFamily: T.font,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {s === 'global' ? 'Global Values' : 'Per-Employee'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selected && (
              <div
                style={{
                  border: `1px solid ${T.border}`,
                  borderRadius: 12,
                  background: T.card,
                  padding: 20,
                }}
              >
                {fieldTab === 'global' ? (
                  <>
                    <p style={{ margin: '0 0 16px', fontSize: 13, color: T.mutedFg }}>
                      Set default values for <strong>global</strong> fields — these apply to all
                      employees unless overridden per-employee.
                    </p>
                    <FieldValuesEditor template={selected} />
                  </>
                ) : (
                  <>
                    <div
                      style={{
                        display: 'flex',
                        gap: 12,
                        alignItems: 'flex-end',
                        marginBottom: 16,
                        flexWrap: 'wrap',
                      }}
                    >
                      <div>
                        <label
                          htmlFor="fv-emp"
                          style={{
                            fontSize: 12,
                            color: T.mutedFg,
                            fontWeight: 600,
                            display: 'block',
                            marginBottom: 4,
                          }}
                        >
                          Select Employee
                        </label>
                        <StyledSelect
                          id="fv-emp"
                          value={fieldEmployee}
                          onChange={setFieldEmployee}
                          options={[
                            { value: '', label: '— Select employee —' },
                            ...employees.map((e) => ({
                              value: e.employeeId,
                              label: `${e.name}${e.designation ? ` · ${e.designation}` : ''}`,
                            })),
                          ]}
                          style={{ minWidth: 240 }}
                        />
                      </div>
                    </div>
                    {fieldEmployee ? (
                      <FieldValuesEditor template={selected} employeeId={fieldEmployee} />
                    ) : (
                      <p style={{ fontSize: 13, color: T.mutedFg, fontStyle: 'italic' }}>
                        Select an employee to set per-employee field values.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {!selected && (
              <div
                style={{
                  border: `1px solid ${T.border}`,
                  borderRadius: 12,
                  background: T.card,
                  padding: 40,
                  textAlign: 'center',
                  color: T.mutedFg,
                }}
              >
                <IconSettings size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                <p style={{ fontSize: 14, margin: 0 }}>
                  Select a template to manage its field values
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Generate Tab ── */}
        {tab === 'generate' && (
          <div
            style={{
              border: `1px solid ${T.border}`,
              borderRadius: 12,
              background: T.card,
              padding: 20,
            }}
          >
            <GeneratePanel templates={templates} />
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .hrlf-page-padding {
          padding: 16px 16px 0;
        }
        .hrlf-content-padding {
          padding: 0 16px 16px;
        }
        .hrlf-preview-pad {
          padding: 16px;
        }
        .hrlf-templates-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
          align-items: start;
        }
        .hrlf-field-row {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
          align-items: start;
        }
        @media (min-width: 640px) {
          .hrlf-page-padding {
            padding: 24px 28px 0;
          }
          .hrlf-content-padding {
            padding: 0 28px 28px;
          }
          .hrlf-preview-pad {
            padding: 40px 48px;
          }
          .hrlf-field-row {
            grid-template-columns: 1fr 1fr auto;
          }
        }
        @media (min-width: 1024px) {
          .hrlf-templates-grid {
            grid-template-columns: 260px 1fr;
          }
        }
      `}</style>
    </div>
  );
}
