import { fmtNum, istNowTime, istToday, istToIso } from '@/features/asset/fleet/lib/format';
import type { ReadingUnit } from '@/features/asset/equipment/types';
import type { CreateWorkLogBody, WorkLog, WorkLogFields } from '../types';
import { UNIT_SHORT } from './format';

/** Every input is a string so a half-typed number never fights the keyboard; parsing happens once, on save. */
export interface FormState {
  machineId: string;
  date: string;
  startTime: string;
  stopTime: string;
  startReading: string;
  stopReading: string;
  operatorId: string;
  workTypeId: string;
  location: string;
  wbsId: string;
  remarks: string;
  meterReset: boolean;
  resetReason: string;
  continuityReason: string;
}

export const num = (s: string): number | null => (s.trim() === '' || !Number.isFinite(Number(s)) ? null : Number(s));

const istTime = (iso: string): string => new Date(iso).toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });

export const blankForm = (machineId: string, date: string): FormState => ({
  machineId,
  date: date > istToday() ? istToday() : date,
  startTime: istNowTime(),
  stopTime: '',
  startReading: '',
  stopReading: '',
  operatorId: '',
  workTypeId: '',
  location: '',
  wbsId: '',
  remarks: '',
  meterReset: false,
  resetReason: '',
  continuityReason: '',
});

export function formFromLog(log: WorkLog): FormState {
  return {
    ...blankForm(log.machineId, log.date),
    date: log.date,
    startTime: istTime(log.startedAt),
    stopTime: log.stoppedAt ? istTime(log.stoppedAt) : '',
    startReading: log.startReading === null ? '' : String(log.startReading),
    stopReading: log.stopReading === null ? '' : String(log.stopReading),
    operatorId: log.operator?.id ?? '',
    workTypeId: log.workType?.id ?? '',
    location: log.locationText ?? '',
    wbsId: log.wbs?.id ?? '',
    remarks: log.remarks ?? '',
    meterReset: log.meterReset,
  };
}

export interface FormContext {
  readingUnit: ReadingUnit;
  lastStop: number | null;
  editing: boolean;
  /** the server asked for these (400 codes), even if the client could not predict it */
  asks: { continuity: boolean; reset: boolean };
}

/** The derived facts the form shows inline and the checks below use. */
export function readingFacts(f: FormState, ctx: FormContext) {
  const metered = ctx.readingUnit !== 'NONE';
  const startN = num(f.startReading);
  const stopN = num(f.stopReading);
  const stopBelowStart = metered && startN !== null && stopN !== null && stopN < startN;
  // continuity is only knowable up front for a new entry; an edit leaves it to the server
  const gap = !ctx.editing && metered && startN !== null && ctx.lastStop !== null ? Math.round((startN - ctx.lastStop) * 100) / 100 : 0;
  const usage = metered && startN !== null && stopN !== null && !stopBelowStart ? Math.round((stopN - startN) * 100) / 100 : null;
  return { metered, startN, stopN, stopBelowStart, gap, usage, unit: UNIT_SHORT[ctx.readingUnit] };
}

/** Clear, human reasons the entry cannot be saved yet. Empty means good to go. */
export function formProblems(f: FormState, ctx: FormContext): string[] {
  const p: string[] = [];
  const r = readingFacts(f, ctx);
  if (!f.machineId) p.push('Choose a machine.');
  if (!f.date) p.push('Pick the date.');
  if (!f.startTime) p.push('Enter the start time.');
  if (r.metered) {
    if (r.startN === null) p.push('Enter the start reading.');
    if ((r.startN ?? 0) < 0 || (r.stopN ?? 0) < 0) p.push('Readings cannot be negative.');
    if (r.stopBelowStart && !f.meterReset) p.push('Stop reading is lower than start. Switch on "Meter was reset" if the meter rolled over or was replaced.');
    if (f.meterReset && f.resetReason.trim().length < 3) p.push('Give a reason for the meter reset.');
    if (!f.meterReset && (r.gap !== 0 || ctx.asks.continuity) && f.continuityReason.trim().length < 3) p.push('Start differs from the last stop: say why.');
    if (r.stopN !== null && !f.stopTime) p.push('Enter the stop time.');
  }
  return p;
}

/** A stop time earlier than the start means the shift ran past midnight, so the stop falls on the next day. */
const stopIso = (f: FormState, startedAt: string): string | undefined => {
  if (!f.stopTime) return undefined;
  const iso = istToIso(f.date, f.stopTime);
  return iso < startedAt ? new Date(new Date(iso).getTime() + 86_400_000).toISOString() : iso;
};

/** Fields for POST (create) and PATCH (update). Blank optional fields are left out. */
export function formFields(f: FormState, ctx: FormContext): WorkLogFields & { startedAt: string } {
  const r = readingFacts(f, ctx);
  const startedAt = istToIso(f.date, f.startTime);
  const out: WorkLogFields & { startedAt: string } = { startedAt };
  const stoppedAt = stopIso(f, startedAt);
  if (stoppedAt) out.stoppedAt = stoppedAt;
  if (r.metered) {
    if (r.startN !== null) out.startReading = r.startN;
    if (r.stopN !== null) out.stopReading = r.stopN;
    if (f.meterReset) {
      out.meterReset = true;
      out.meterResetReason = f.resetReason.trim();
    } else if (ctx.editing) {
      out.meterReset = false;
    }
    if (!f.meterReset && f.continuityReason.trim()) out.continuityReason = f.continuityReason.trim();
  }
  if (f.operatorId) out.operatorId = f.operatorId;
  if (f.workTypeId) out.workTypeId = f.workTypeId;
  if (f.location.trim()) out.locationText = f.location.trim();
  if (f.wbsId) out.wbsActivityId = f.wbsId;
  if (f.remarks.trim()) out.remarks = f.remarks.trim();
  return out;
}

export const createBody = (f: FormState, ctx: FormContext, clientRequestId: string): CreateWorkLogBody => ({
  clientRequestId,
  machineId: f.machineId,
  ...formFields(f, ctx),
});

export const gapText = (gap: number, lastStop: number | null, unit: string): string =>
  `Start is ${fmtNum(Math.abs(gap))} ${unit} ${gap > 0 ? 'above' : 'below'} the last stop (${fmtNum(lastStop)}).`;
