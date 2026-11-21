// @ts-nocheck
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { UploadCloud, FileSpreadsheet, Check, Building2, MapPin, Calendar } from 'lucide-react';
import { saveDesignForProject } from '@/systems/pms/utils/storageManager';
import ModalForm from '@/systems/pms/components/ModalForm';

// Column keys must match the ones used by ViewDesign.jsx
export const DESIGN_COLUMNS = [
  { key: 'alignment', label: 'Alignment' },
  { key: 'chainage', label: 'Chainage' },
  { key: 'elevation', label: 'Elevation' },
  { key: 'pipeTop', label: 'Pipe Top' },
  { key: 'pipeBottom', label: 'Pipe Bottom' },
  { key: 'cuttingLevel', label: 'Cutting Level' },
  { key: 'invertLevel', label: 'Invert Level' },
  { key: 'pipeDia', label: 'Pipe Dia' },
  { key: 'valve', label: 'Valve' },
];

// Accepts a few common spellings/variants for each column header in the uploaded file
const HEADER_ALIASES = {
  alignment: 'alignment',
  chainage: 'chainage',
  elevation: 'elevation',
  pipetop: 'pipeTop',
  pipebottom: 'pipeBottom',
  pipebutton: 'pipeBottom',
  cuttinglevel: 'cuttingLevel',
  invertlevel: 'invertLevel',
  pipedia: 'pipeDia',
  pipediameter: 'pipeDia',
  pipedie: 'pipeDia',
  valve: 'valve',
  valves: 'valve',
  valvetype: 'valve',
  valveno: 'valve',
  valvename: 'valve',
  typeofvalve: 'valve',
};

const normalizeKey = (key) => String(key).toLowerCase().replace(/[^a-z]/g, '');

// Parses an uploaded Excel/CSV File into DESIGN_COLUMNS rows - tries header-name matching first,
// falling back to positional (Alignment/Chainage/.../Pipe Dia) order when headers don't match.
// Shared with AddMinorModal.jsx so a minor's own design file uses the exact same parsing rules.
export const parseDesignFile = async (file) => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  const jsonRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  // Valve column: a header naming "valve" wins; otherwise (any spelling, e.g. "Remark") it is the
  // column right after Pipe Dia
  const headerKeys = jsonRows.length ? Object.keys(jsonRows[0]) : [];
  const hasData = (k) => jsonRows.some(r => String(r[k] ?? '').trim() !== '');
  const diaIdx = headerKeys.findIndex(k => HEADER_ALIASES[normalizeKey(k)] === 'pipeDia');
  const nextKey = diaIdx >= 0 ? headerKeys[diaIdx + 1] : undefined;
  // Valve name = first real (non-empty, not TRUE/FALSE) value in the columns after Pipe Dia, whatever their headers
  // ("Valve", "Remark", blank ...). Rows without a name stay empty. Without a Pipe Dia header, a "valve" header is used.
  const isBoolLike = (v) => typeof v === 'boolean' || ['true', 'false'].includes(String(v ?? '').trim().toLowerCase());
  const valveKeys = diaIdx >= 0
    ? headerKeys.slice(diaIdx + 1).filter(k => !HEADER_ALIASES[normalizeKey(k)] || HEADER_ALIASES[normalizeKey(k)] === 'valve')
    : headerKeys.filter(k => normalizeKey(k).includes('valve'));
  const pickValve = (row) => {
    for (const k of valveKeys) {
      const v = row[k];
      if (String(v ?? '').trim() !== '' && !isBoolLike(v)) return v;
    }
    return '';
  };

  let mappedRows = jsonRows.map(row => {
    const mapped = {};
    Object.keys(row).forEach(key => {
      const target = HEADER_ALIASES[normalizeKey(key)];
      if (target && target !== 'valve') mapped[target] = row[key];
    });
    mapped.valve = pickValve(row);
    return mapped;
  }).filter(row => Object.values(row).some(v => String(v ?? '').trim() !== ''));

  // Fallback: if header matching found almost nothing, assume columns are in the fixed order
  // Alignment/Chainage/.../Pipe Dia and skip the header row
  const matchedFieldCount = mappedRows.reduce((sum, r) => sum + Object.keys(r).length, 0);
  if (jsonRows.length > 0 && matchedFieldCount < jsonRows.length) {
    const arrayRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    const bodyRows = arrayRows.slice(1);
    const positional = bodyRows
      .filter(r => r.some(cell => String(cell).trim() !== ''))
      .map(r => {
        const mapped = {};
        DESIGN_COLUMNS.forEach((col, idx) => {
          mapped[col.key] = r[idx] ?? '';
        });
        return mapped;
      });
    if (positional.length >= mappedRows.length) {
      mappedRows = positional;
    }
  }

  return mappedRows;
};

// Show the value as-is (0 included) - only fall back to '-' when it's actually empty.
// Numeric values are shown with 3 digits after the decimal point; non-numeric text is untouched.
const displayVal = (v) => {
  if (v === undefined || v === null || v === '') return '-';
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(3) : v;
};

export default function UploadDesign({ isOpen, onClose, project, onUploaded }) {
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  if (!isOpen || !project) return null;

  const resetState = () => {
    setFileName('');
    setRows([]);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const mappedRows = await parseDesignFile(file);
      if (mappedRows.length === 0) {
        toast.error('No valid rows found in the file');
        return;
      }

      setFileName(file.name);
      setRows(mappedRows);
      toast.success(`${mappedRows.length} rows loaded`);
    } catch (error) {
      toast.error('Could not read file. Please upload a valid Excel/CSV file.');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (rows.length === 0) {
      toast.error('Please upload a file first');
      return;
    }

    setLoading(true);
    saveDesignForProject(project.serialNo, rows);
    toast.success(`Design uploaded for ${project.serialNo}`);
    setLoading(false);
    resetState();
    onUploaded && onUploaded();
    onClose();
  };

  return (
    <ModalForm
      isOpen={isOpen}
      onClose={handleClose}
      title={`Upload Design - ${project.serialNo}`}
      onSubmit={handleSubmit}
      submitText={loading ? 'Uploading...' : 'Upload'}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-3 md:space-y-4">
        {/* Prefilled Project Info */}
        <div className="grid grid-cols-2 gap-2 md:gap-4 pb-3 md:pb-4 border-b border-gray-100">
          <div className="space-y-1">
            <label className="block text-[10px] md:text-[12px] text-gray-500 uppercase tracking-tighter">Project Name</label>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded px-3 py-1.5 h-[34px] md:h-[38px]">
              <Building2 size={14} className="text-gray-400 flex-shrink-0" />
              <span className="text-[13px] md:text-[15px] text-gray-800 truncate">{project.projectName}</span>
            </div>
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] md:text-[12px] text-gray-500 uppercase tracking-tighter">Project Location</label>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded px-3 py-1.5 h-[34px] md:h-[38px]">
              <MapPin size={14} className="text-gray-400 flex-shrink-0" />
              <span className="text-[13px] md:text-[15px] text-gray-800 truncate">{project.projectLocation}</span>
            </div>
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] md:text-[12px] text-gray-500 uppercase tracking-tighter">Start Date</label>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded px-3 py-1.5 h-[34px] md:h-[38px]">
              <Calendar size={14} className="text-gray-400 flex-shrink-0" />
              <span className="text-[13px] md:text-[15px] text-gray-800 truncate">{project.startDate}</span>
            </div>
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] md:text-[12px] text-gray-500 uppercase tracking-tighter">Planned End Date</label>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded px-3 py-1.5 h-[34px] md:h-[38px]">
              <Calendar size={14} className="text-gray-400 flex-shrink-0" />
              <span className="text-[13px] md:text-[15px] text-gray-800 truncate">{project.plannedEndDate}</span>
            </div>
          </div>
        </div>

        {/* File Upload */}
        <div className="space-y-1">
          <label className="block text-[13px] md:text-[15px] text-gray-700 uppercase tracking-tight">
            Upload Design File (Alignment / Chainage / Elevation / Pipe Top / Pipe Bottom / Cutting Level / Invert Level / Pipe Dia / Valve)
          </label>
          <label className="cursor-pointer block">
            <div className={`flex items-center justify-center gap-2 border border-dashed rounded-lg h-[70px] transition-all
              ${fileName ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-gray-50 border-gray-300 text-gray-400 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600'}
            `}>
              {fileName ? <Check size={18} /> : <UploadCloud size={18} />}
              <span className="text-xs md:text-sm font-medium">
                {fileName ? `${fileName} - ${rows.length} rows` : 'Click to browse Excel / CSV file'}
              </span>
            </div>
            <input
              type="file"
              onChange={handleFile}
              className="hidden"
              accept=".xlsx,.xls,.csv"
            />
          </label>
        </div>

        {/* Preview */}
        {rows.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[10px] md:text-xs text-gray-500 uppercase tracking-widest">
              <FileSpreadsheet size={14} />
              <span>Preview (first 5 rows)</span>
            </div>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-[10px] md:text-[11px]">
                <thead className="bg-gray-50">
                  <tr>
                    {DESIGN_COLUMNS.map(col => (
                      <th key={col.key} className="px-2 py-1.5 text-center font-semibold text-gray-700 whitespace-nowrap">{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.slice(0, 5).map((row, idx) => (
                    <tr key={idx}>
                      {DESIGN_COLUMNS.map(col => (
                        <td key={col.key} className="px-2 py-1.5 text-center text-gray-600 whitespace-nowrap">{displayVal(row[col.key])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </ModalForm>
  );
}
