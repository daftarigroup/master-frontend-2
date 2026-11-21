// @ts-nocheck
// "Contract by Vendor": table + "Create Contract" button. Each click adds a contract form (supplier from Vendors master + items); Save stores all of them.
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Pencil, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  fetchVendorMaster, fetchContractVendors, saveContractVendor, deleteContractVendor, type ContractVendor,
} from '../../utils/contractVendors';

const blankItem = () => ({ product_name: '', quantity: 1, uom: 'Nos', rate: 0, gst_percent: 18, discount_percent: 0 });
let uid = 0;
const blank = () => ({ key: ++uid, vendor_id: null, name: '', address: '', gstin: '', email: '', phone: '', items: [blankItem()] });

export default function PmsContractVendorsView() {
  const [saved, setSaved] = useState<ContractVendor[]>([]);
  const [master, setMaster] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState<ContractVendor | null>(null);

  const reload = async () => setSaved(await fetchContractVendors());
  useEffect(() => { reload(); fetchVendorMaster().then(setMaster); }, []);

  const patchDraft = (key: number, fn: (d: any) => any) => setDrafts((ds) => ds.map((d) => (d.key === key ? fn(d) : d)));
  const setItem = (key: number, i: number, k: string, v: any) =>
    patchDraft(key, (d) => ({ ...d, items: d.items.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)) }));

  const pickVendor = (key: number, id: string) => {
    const m = master.find((v) => String(v.id) === id);
    if (!m) return;
    const s = saved.find((v) => v.name === m.vendor_name);
    patchDraft(key, (d) => ({
      ...d, vendor_id: String(m.id), name: m.vendor_name, address: m.address || '', gstin: m.gstin || '', email: m.email || '', phone: m.phone || '',
      items: s ? JSON.parse(JSON.stringify(s.items)) : d.items,
    }));
  };

  const saveAll = async () => {
    for (let n = 0; n < drafts.length; n++) {
      const d = drafts[n];
      if (!d.name) return toast.error(`Contract #${n + 1}: select a supplier`);
      if (!d.items.some((it) => it.product_name.trim())) return toast.error(`Contract #${n + 1}: add at least one item`);
    }
    setSaving(true);
    for (const d of drafts) {
      const res: any = await saveContractVendor({ vendor_id: d.vendor_id, name: d.name, items: d.items.filter((it) => it.product_name.trim()) });
      if (res?.success === false || res?.error) { setSaving(false); return toast.error(res.error || `Failed to save ${d.name}`); }
    }
    setSaving(false);
    toast.success(`${drafts.length} contract${drafts.length > 1 ? 's' : ''} saved`);
    setDrafts([]);
    reload();
  };

  const ro = (label: string, val: string) => (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-slate-700">{label}</Label>
      <Input className="h-9 bg-slate-100 text-sm" readOnly value={val || '-'} />
    </div>
  );

  const editSaved = (v: ContractVendor) => {
    if (drafts.some((d) => d.name === v.name)) return;
    setDrafts((ds) => [...ds, { ...JSON.parse(JSON.stringify(v)), key: ++uid }]);
  };

  return (
    <div className="p-2 sm:p-4 md:p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex justify-end">
        <Button type="button" onClick={() => setDrafts((ds) => [...ds, blank()])} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
          <Plus className="w-4 h-4" /> Create Contract
        </Button>
      </div>

      {drafts.map((d, n) => (
        <div key={d.key} className="bg-white border border-slate-200 rounded-md p-4 sm:p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase bg-blue-600 text-white px-2.5 py-1 rounded-md">CONTRACT #{n + 1}</span>
            <Button type="button" variant="ghost" size="sm" className="text-red-500" onClick={() => setDrafts((ds) => ds.filter((x) => x.key !== d.key))}>
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Supplier Name</Label>
            <Select value={d.vendor_id ? String(d.vendor_id) : ''} onValueChange={(v) => pickVendor(d.key, v)}>
              <SelectTrigger className="h-9 bg-white w-full"><SelectValue placeholder="Select supplier" /></SelectTrigger>
              <SelectContent>
                {master.map((v) => <SelectItem key={v.id} value={String(v.id)}>{v.vendor_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ro('Supplier Address', d.address)}
            {ro('GSTIN', d.gstin)}
            {ro('Company Email', d.email)}
            {ro('Phone', d.phone)}
          </div>

          <div className="rounded-[3px] overflow-x-auto border border-slate-200">
            <Table className="min-w-[650px]">
              <TableHeader className="bg-[#f1f5f9]">
                <TableRow>
                  {['S/N', 'Product', 'Qty', 'Unit', 'Rate', 'GST (%)', 'Discount (%)', ''].map((h) => <TableHead key={h} className="text-xs font-semibold">{h}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.items.map((it, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs">{i + 1}</TableCell>
                    <TableCell><Input className="h-8 text-xs" value={it.product_name} onChange={(e) => setItem(d.key, i, 'product_name', e.target.value)} placeholder="Product" /></TableCell>
                    <TableCell><Input type="number" className="h-8 w-20 text-xs" value={it.quantity} onChange={(e) => setItem(d.key, i, 'quantity', parseFloat(e.target.value) || 0)} /></TableCell>
                    <TableCell><Input className="h-8 w-20 text-xs" value={it.uom} onChange={(e) => setItem(d.key, i, 'uom', e.target.value)} /></TableCell>
                    <TableCell><Input type="number" className="h-8 w-24 text-xs" value={it.rate} onChange={(e) => setItem(d.key, i, 'rate', parseFloat(e.target.value) || 0)} /></TableCell>
                    <TableCell><Input type="number" className="h-8 w-16 text-xs" value={it.gst_percent} onChange={(e) => setItem(d.key, i, 'gst_percent', parseFloat(e.target.value) || 0)} /></TableCell>
                    <TableCell><Input type="number" className="h-8 w-16 text-xs" value={it.discount_percent} onChange={(e) => setItem(d.key, i, 'discount_percent', parseFloat(e.target.value) || 0)} /></TableCell>
                    <TableCell>
                      <Button type="button" variant="ghost" size="sm" onClick={() => patchDraft(d.key, (x) => ({ ...x, items: x.items.filter((_, k) => k !== i) }))}>
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => patchDraft(d.key, (x) => ({ ...x, items: [...x.items, blankItem()] }))}>
            <Plus className="w-4 h-4 mr-1" /> Add Item
          </Button>
        </div>
      ))}

      {drafts.length > 0 && (
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setDrafts([])}>CANCEL</Button>
          <Button type="button" disabled={saving} onClick={saveAll} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
            <Save className="w-4 h-4" /> {saving ? 'SAVING...' : `SAVE ${drafts.length} CONTRACT${drafts.length > 1 ? 'S' : ''}`}
          </Button>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-md shadow-sm overflow-x-auto">
        <Table>
          <TableHeader className="bg-[#f1f5f9]">
            <TableRow>
              {['S/N', 'Supplier', 'Items', ''].map((h) => <TableHead key={h} className="text-xs font-bold text-slate-700">{h}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {saved.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-10 text-xs text-slate-400 italic">No contracts yet. Click "Create Contract".</TableCell></TableRow>
            ) : saved.map((v, i) => (
              <TableRow key={v.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setViewing(v)}>
                <TableCell className="text-xs w-12">{i + 1}</TableCell>
                <TableCell className="text-xs font-medium">{v.name}</TableCell>
                <TableCell className="text-xs">{v.items.length}</TableCell>
                <TableCell className="text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  <Button type="button" variant="ghost" size="sm" onClick={() => editSaved(v)}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button type="button" variant="ghost" size="sm" onClick={async () => { await deleteContractVendor(v.id!); reload(); }}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{viewing?.name}</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div><span className="font-semibold text-slate-600">Address: </span>{viewing.address || '-'}</div>
                <div><span className="font-semibold text-slate-600">GSTIN: </span>{viewing.gstin || '-'}</div>
                <div><span className="font-semibold text-slate-600">Email: </span>{viewing.email || '-'}</div>
                <div><span className="font-semibold text-slate-600">Phone: </span>{viewing.phone || '-'}</div>
              </div>
              <div className="rounded border border-slate-200 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-[#f1f5f9]">
                    <TableRow>{['S/N', 'Product', 'Qty', 'Unit', 'Rate', 'GST (%)', 'Discount (%)'].map((h) => <TableHead key={h} className="text-xs">{h}</TableHead>)}</TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewing.items.map((it, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs">{i + 1}</TableCell>
                        <TableCell className="text-xs">{it.product_name}</TableCell>
                        <TableCell className="text-xs">{it.quantity}</TableCell>
                        <TableCell className="text-xs">{it.uom}</TableCell>
                        <TableCell className="text-xs">{it.rate}</TableCell>
                        <TableCell className="text-xs">{it.gst_percent}</TableCell>
                        <TableCell className="text-xs">{it.discount_percent}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
