// @ts-nocheck
// Pending PO queue + Create PO + PO History in one page. Clicking a pending row opens Create PO prefilled for that indent.
import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Clock, FilePlus, History } from 'lucide-react';
import PmsPendingPOView from './PmsPendingPOView';
import PmsCreatePOView from './PmsCreatePOView';
import PmsPOHistoryView from './PmsPOHistoryView';

export default function PmsPurchaseOrdersView() {
  const [tab, setTab] = useState<'pending' | 'create' | 'history'>('pending');
  const [prefill, setPrefill] = useState<{ indentId: any; itemId: any } | null>(null);
  const [createKey, setCreateKey] = useState(0);

  const openCreate = (sel: { indentId: any; itemId: any } | null) => {
    setPrefill(sel);
    setCreateKey((k) => k + 1); // fresh form for every selection
    setTab('create');
  };

  return (
    <div className="space-y-2">
      <Tabs value={tab} onValueChange={(v: any) => (v === 'create' ? openCreate(null) : setTab(v))} className="w-full">
        <div className="px-6 pt-6 max-w-7xl mx-auto">
          <TabsList className="grid w-full grid-cols-3 max-w-xl bg-slate-100 p-1 rounded-xl">
            <TabsTrigger value="pending" className="font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Clock className="w-4 h-4 mr-2 text-blue-600" /> Pending PO
            </TabsTrigger>
            <TabsTrigger value="create" className="font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <FilePlus className="w-4 h-4 mr-2 text-emerald-600" /> Create PO
            </TabsTrigger>
            <TabsTrigger value="history" className="font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <History className="w-4 h-4 mr-2 text-slate-600" /> PO History
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="pending" className="mt-0">
          <PmsPendingPOView onSelect={openCreate} />
        </TabsContent>
        <TabsContent value="create" className="mt-0">
          <PmsCreatePOView key={createKey} prefill={prefill} onCreated={() => setTab('history')} />
        </TabsContent>
        <TabsContent value="history" className="mt-0">
          <PmsPOHistoryView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
