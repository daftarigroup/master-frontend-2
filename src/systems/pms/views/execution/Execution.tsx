// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Sparkles } from 'lucide-react';
import { generateId, getTodayDate } from '@/systems/pms/utils/helpers';
import { saveExecution, getExecutions } from '@/systems/pms/utils/storageManager';
import { computeBackFillingValue } from '@/systems/pms/utils/backFillingCalc';
import ModalForm from '@/systems/pms/components/ModalForm';
import { DESIGN_COLUMNS } from './UploadDesign';

// Alignment is shown separately above - exclude it from the Design/Execution measurement grids
const MEASURE_COLUMNS = DESIGN_COLUMNS.filter(col => col.key !== 'alignment' && col.key !== 'valve');

// Numeric values are shown with 3 digits after the decimal point; non-numeric/empty values pass through
const fmt3 = (v) => {
  if (v === undefined || v === null || v === '') return '';
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(3) : v;
};

const isValveTruthy = (val) => {
  if (!val) return false;
  if (typeof val === 'boolean') return val;
  const s = String(val).trim().toLowerCase();
  return s !== '' && s !== 'false' && s !== '0' && s !== 'no' && s !== '-';
};

const getCurrentTime = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
};

const getRowValveName = (row) => {
  if (!row) return '';
  const val = row.valve;
  if (!val) return '';
  if (typeof val === 'boolean') return '';
  const s = String(val).trim();
  if (['false', '0', 'no', '-', 'null', 'undefined'].includes(s.toLowerCase())) return '';
  return s;
};

// Execution values start pre-filled from the Design row (still fully editable)
const prefillValues = (designRow) =>
  MEASURE_COLUMNS.reduce((acc, col) => ({ ...acc, [col.key]: designRow?.[col.key] ?? '' }), {});

export default function Execution({ isOpen, onClose, project, designRow, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [values, setValues] = useState({});
  const [submitDate, setSubmitDate] = useState(getTodayDate());
  const [submitTime, setSubmitTime] = useState(getCurrentTime());
  const [remarks, setRemarks] = useState('');
  const [isHardRock, setIsHardRock] = useState(false);
  const [hardRockValue, setHardRockValue] = useState('');
  const [excavation, setExcavation] = useState(true);
  const [pipeLaying, setPipeLaying] = useState(true);
  const [backFilling, setBackFilling] = useState(true);
  const [backFillingValue, setBackFillingValue] = useState('');
  const [valve, setValve] = useState(false);
  const [valveName, setValveName] = useState('');

  const rowValveName = getRowValveName(designRow);

  useEffect(() => {
    if (isOpen && designRow) {
      setValues(prefillValues(designRow));
      setSubmitDate(getTodayDate());
      setSubmitTime(getCurrentTime());
      setRemarks('');
      setIsHardRock(false);
      setHardRockValue('');
      setExcavation(true);
      setPipeLaying(true);
      setBackFilling(true);
      setBackFillingValue('');
      const rName = getRowValveName(designRow);
      setValve(Boolean(rName || isValveTruthy(designRow.valve)));
      setValveName(rName);
    }
  }, [isOpen, designRow]);

  // Remarks becomes mandatory the moment any of the three stage checkboxes is unchecked
  const allStagesDone = excavation && pipeLaying && backFilling;

  // Back Filling Value is calculated automatically from the execution values
  useEffect(() => {
    if (!isOpen || !project || !designRow || !backFilling) return;
    const projectEntries = getExecutions().filter(e => e.projectNo === project.serialNo);
    const val = computeBackFillingValue(projectEntries, {
      serialNo: designRow.__serialNo,
      execution: values,
      design: { cuttingLevel: designRow.cuttingLevel },
      isHardRock,
      hardRockValue,
    });
    setBackFillingValue(val === null ? '' : val.toFixed(3));
  }, [isOpen, project, designRow, backFilling, values, isHardRock, hardRockValue]);

  if (!isOpen || !project || !designRow) return null;

  const handleChange = (key, value) => {
    setValues(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const hasAnyValue = MEASURE_COLUMNS.some(col => String(values[col.key] ?? '').trim() !== '');
    if (!hasAnyValue) {
      toast.error('Please fill at least one execution value');
      return;
    }
    if (!submitDate) {
      toast.error('Submit Date is required');
      return;
    }
    if (isHardRock && !String(hardRockValue).trim()) {
      toast.error('Please enter the Hard Rock value');
      return;
    }
    if (backFilling && !String(backFillingValue).trim()) {
      toast.error('Please enter the Back Filling value');
      return;
    }
    if (!allStagesDone && !String(remarks).trim()) {
      toast.error('Remarks is mandatory when Excavation / Pipe Laying / Back Filling is unchecked');
      return;
    }

    setLoading(true);

    const design = MEASURE_COLUMNS.reduce((acc, col) => ({ ...acc, [col.key]: designRow[col.key] ?? '' }), {});
    const now = new Date();
    const timeToUse = submitTime || getCurrentTime();
    const [sYear, sMonth, sDay] = String(submitDate).split('-');
    const formattedDate = (sYear && sMonth && sDay) ? `${sDay}/${sMonth}/${sYear}` : submitDate;
    const timestamp = `${formattedDate} ${timeToUse}`;

    const finalValveName = valve ? (valveName.trim() || rowValveName || 'Valve') : '';

    const entry = {
      id: generateId(),
      timestamp,
      submissionDateTime: timestamp,
      submitDate,
      submitTime: timeToUse,
      createdAt: now.toISOString(),
      projectNo: project.serialNo,
      projectName: project.projectName,
      serialNo: designRow.__serialNo,
      alignment: designRow.alignment,
      remarks,
      isHardRock,
      hardRockValue: isHardRock ? hardRockValue : '',
      excavation,
      pipeLaying,
      backFilling,
      backFillingValue: backFilling ? backFillingValue : '',
      valve,
      valveName: finalValveName,
      isValve: valve,
      design: {
        ...design,
        valve: designRow.valve ?? ''
      },
      execution: {
        ...values,
        valve: valve ? finalValveName : false,
        valveName: finalValveName
      }
    };

    saveExecution(entry);
    toast.success('Execution entry saved');
    setLoading(false);
    onSaved && onSaved();
    onClose();
  };

  return (
    <ModalForm
      isOpen={isOpen}
      onClose={onClose}
      title="Execution Entry"
      onSubmit={handleSubmit}
      submitText={loading ? 'Saving...' : 'Save'}
      maxWidth="max-w-6xl"
    >
      <div className="space-y-3 md:space-y-4">
        {/* Header Action Row */}
        <div className="flex items-center justify-between pb-1 border-b border-gray-100">
          <span className="text-[10px] md:text-[11px] font-bold text-indigo-500 uppercase tracking-widest">
            Execution Details & Measurements
          </span>
         </div>

        <div className="pb-2 border-b border-gray-100 flex flex-wrap gap-2 md:gap-4">
          <div className="w-full sm:w-48 space-y-1">
            <label className="block text-[10px] md:text-[12px] text-gray-500 uppercase tracking-tighter">Alignment</label>
            <input
              type="text"
              value={designRow.alignment || ''}
              readOnly
              className="w-full border border-gray-200 bg-gray-100 text-indigo-600 font-bold rounded px-2 py-1 focus:outline-none text-[12px] md:text-[13px] h-[34px] md:h-[38px] cursor-not-allowed"
            />
          </div>
          <div className="w-full sm:w-48 space-y-1">
            <label className="block text-[10px] md:text-[12px] text-gray-700 uppercase tracking-tighter">Submit Date *</label>
            <input
              type="date"
              value={submitDate}
              onChange={(e) => setSubmitDate(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[12px] md:text-[13px] h-[34px] md:h-[38px]"
            />
          </div>
          <div className="w-full sm:w-44 space-y-1">
            <label className="block text-[10px] md:text-[12px] text-gray-700 uppercase tracking-tighter">Submission Time *</label>
            <input
              type="time"
              step="1"
              value={submitTime}
              onChange={(e) => setSubmitTime(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[12px] md:text-[13px] h-[34px] md:h-[38px]"
            />
          </div>
          <div className="flex items-end gap-3 flex-wrap">
            <div className="space-y-1">
              <label className="flex items-center gap-2 h-[34px] md:h-[38px] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isHardRock}
                  onChange={(e) => { setIsHardRock(e.target.checked); if (!e.target.checked) setHardRockValue(''); }}
                  className="w-4 h-4 accent-indigo-600 cursor-pointer"
                />
                <span className="text-[10px] md:text-[12px] text-gray-700 uppercase tracking-tighter">If Hard Rock</span>
              </label>
            </div>
            {isHardRock && (
              <div className="space-y-1">
                <label className="block text-[10px] md:text-[12px] text-gray-700 uppercase tracking-tighter">Hard Rock Level *</label>
                <input
                  type="text"
                  value={hardRockValue}
                  onChange={(e) => setHardRockValue(e.target.value)}
                  placeholder="Enter"
                  autoFocus
                  className="w-[160px] md:w-[200px] border border-indigo-400 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-[12px] md:text-[13px] h-[34px] md:h-[38px]"
                />
              </div>
            )}
            <div className="space-y-1">
              <label className="flex items-center gap-2 h-[34px] md:h-[38px] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={valve}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setValve(checked);
                    if (!checked) setValveName('');
                    else if (!valveName && rowValveName) setValveName(rowValveName);
                  }}
                  className="w-4 h-4 accent-indigo-600 cursor-pointer"
                />
                <span className="text-[10px] md:text-[12px] text-gray-700 uppercase tracking-tighter">
                  {rowValveName ? (
                    <>
                      Valve: <span className="text-indigo-600 font-bold normal-case">{rowValveName}</span>
                    </>
                  ) : (
                    'Valve'
                  )}
                </span>
              </label>
            </div>
            {valve && !rowValveName && (
              <div className="space-y-1">
                <label className="block text-[10px] md:text-[12px] text-gray-700 uppercase tracking-tighter">Valve Name</label>
                <input
                  type="text"
                  value={valveName}
                  onChange={(e) => setValveName(e.target.value)}
                  placeholder="e.g. Air Valve"
                  className="w-[160px] md:w-[200px] border border-indigo-400 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-[12px] md:text-[13px] h-[34px] md:h-[38px]"
                />
              </div>
            )}
          </div>
        </div>

        {/* Stage checkboxes - default checked; unchecking any one makes Remarks mandatory */}
        <div className="pb-2 border-b border-gray-100 flex flex-wrap items-center gap-3 md:gap-5">
          {[
            { label: 'Excavation', value: excavation, setValue: setExcavation },
            { label: 'Pipe Laying', value: pipeLaying, setValue: setPipeLaying },
            {
              label: 'Back Filling',
              value: backFilling,
              setValue: (val) => {
                setBackFilling(val);
                if (!val) setBackFillingValue('');
              }
            },
          ].map(({ label, value, setValue }) => (
            <label key={label} className="flex items-center gap-2 h-[34px] md:h-[38px] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => setValue(e.target.checked)}
                className="w-4 h-4 accent-indigo-600 cursor-pointer"
              />
              <span className="text-[10px] md:text-[12px] text-gray-700 uppercase tracking-tighter">{label}</span>
            </label>
          ))}

          {backFilling && (
            <div className="flex items-center gap-2">
              <label className="text-[10px] md:text-[12px] text-gray-700 uppercase tracking-tighter whitespace-nowrap">
                Back Filling Value:
              </label>
              <input
                type="text"
                value={backFillingValue}
                readOnly
                title="(Soft Strata + Hard Strata) - Murum Bedding Qty - Pipe Area"
                placeholder="Auto-calculated"
                className="w-[140px] md:w-[180px] border border-indigo-400 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-[12px] md:text-[13px] h-[32px] md:h-[36px]"
              />
            </div>
          )}
        </div>

        {/* Design row (read-only, pre-filled) */}
        <div>
          <h3 className="text-[10px] md:text-xs text-gray-500 uppercase tracking-widest mb-1.5">Design</h3>
          <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
            {MEASURE_COLUMNS.map(col => (
              <div key={col.key} className="space-y-1">
                <label className="block text-[9px] md:text-[10px] text-gray-400 uppercase tracking-tighter truncate">{col.label}</label>
                <input
                  type="text"
                  value={fmt3(designRow[col.key])}
                  readOnly
                  className="w-full border border-gray-200 bg-gray-100 text-gray-600 rounded px-2 py-1 focus:outline-none text-[11px] md:text-[12px] h-[34px] md:h-[38px] cursor-not-allowed"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Execution row (editable) */}
        <div>
          <h3 className="text-[10px] md:text-xs text-indigo-500 uppercase tracking-widest mb-1.5">Execution</h3>
          <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
            {MEASURE_COLUMNS.map(col => (
              <div key={col.key} className="space-y-1">
                <label className="block text-[9px] md:text-[10px] text-gray-500 uppercase tracking-tighter truncate">{col.label}</label>
                <input
                  type="text"
                  value={values[col.key]}
                  onChange={(e) => handleChange(col.key, e.target.value)}
                  placeholder="Enter"
                  className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] md:text-[12px] h-[34px] md:h-[38px]"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Remarks */}
        <div className="space-y-1">
          <label className="block text-[10px] md:text-[12px] text-gray-500 uppercase tracking-tighter">
            Remarks {!allStagesDone && <span className="text-red-500">*</span>}
          </label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder={allStagesDone ? 'Add any remarks (optional)' : 'Remarks required when a stage is unchecked'}
            rows={2}
            className="w-full border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] md:text-[12px] resize-none"
          />
        </div>
      </div>
    </ModalForm>
  );
}
