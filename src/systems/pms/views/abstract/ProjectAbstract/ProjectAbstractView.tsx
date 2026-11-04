// @ts-nocheck
import React, { useMemo, useEffect, useState } from 'react';
import {
  loadProjectAbstract,
  saveProjectAbstract,
  logAuditAction,
  ProjectAbstractState
} from '@/systems/pms/utils/abstractStorage';
import {
  calculateFullAbstract
} from '@/systems/pms/utils/abstractEngine';
import AbstractSheetTab from './AbstractSheetTab';
import { toast } from 'sonner';

interface Props {
  projectNo?: string;
  projectName?: string;
}

export default function ProjectAbstractView({
  projectNo = 'PN-002',
  projectName = 'Godavari Valley Minor Irrigation Network'
}: Props) {
  // Load state from local storage or initialize seed
  const [state, setState] = useState<ProjectAbstractState>(() => {
    return loadProjectAbstract(projectNo);
  });

  // Sync state changes to storage whenever state updates
  useEffect(() => {
    saveProjectAbstract(projectNo, state);
  }, [state, projectNo]);

  // LIVE CALCULATED ABSTRACT
  const calculatedAbstract = useMemo(() => {
    return calculateFullAbstract(
      state.minors,
      state.surveyRowsByMinor,
      state.plannedQtyByMinor,
      state.adjustments,
      state.inputs,
      state.overrideExecutedByMinor
    );
  }, [state]);

  // Refresh CADWM simulated job
  const handleRefreshCAD = () => {
    setState(prev => {
      const updatedInputs = {
        ...prev.inputs,
        cad_last_refreshed: new Date().toISOString()
      };
      return logAuditAction(
        { ...prev, inputs: updatedInputs },
        'IMPORT_DATA',
        'Synced CADWM quantities from external sheet source'
      );
    });
    toast.success('CADWM quantities synced from source sheet');
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-2 sm:p-3 font-sans">
      <AbstractSheetTab
        abstract={calculatedAbstract}
        inputs={state.inputs}
        projectName={projectName}
        onRefreshCAD={handleRefreshCAD}
      />
    </div>
  );
}
