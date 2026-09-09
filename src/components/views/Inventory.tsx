import Heading from '../element/Heading';
import type { ColumnDef } from '@tanstack/react-table';
import { Pill } from '../ui/pill';
import { Store, Settings2, ArrowRightLeft, Send, Package, Building2, Info, AlertCircle, Search } from 'lucide-react';
import DataTable from '../element/DataTable';
import { useSheets } from '@/context/SheetsContext';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { storeApi } from '@/lib/apiClient';
import type { InventoryRecord } from '@/services/inventoryService';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { calculateRealInventory } from '@/lib/inventoryUtils';
import type { InventorySheet } from '@/types/sheets';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { filterByFirmAccess } from '@/lib/firmAccess';
import { useProject } from '@/context/ProjectContext';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DetailRow {
    date: string;
    refNo: string;
    quantity: number;
    rate?: number;
    amount?: number;
    party: string;
    projectName: string;
    siteLocation?: string;
}

export default () => {
    const {
        inventorySheet,
        indentSheet,
        storeInSheet,
        issueSheet,
        poMasterSheet,
        inventoryLoading,
        indentLoading,
        storeInLoading,
        issueLoading,
        masterSheet,
        updateStockTransferSheet,
        stockTransferSheet
    } = useSheets();
    const { user } = useAuth();
    const { selectedProjectId: globalProjectId } = useProject();

    const [selectedProjectId, setSelectedProjectId] = useState<string>(() => {
        return globalProjectId && globalProjectId !== 'all' ? String(globalProjectId) : 'All';
    });

    const [selectedParty, setSelectedParty] = useState<string>('All');

    useEffect(() => {
        if (globalProjectId) {
            setSelectedProjectId(globalProjectId === 'all' ? 'All' : String(globalProjectId));
        }
    }, [globalProjectId]);

    useEffect(() => {
        setSelectedParty('All');
    }, [selectedProjectId]);

    const selectedFirm = useMemo(() => {
        if (selectedProjectId === 'All') return null;
        return (masterSheet?.firmObjects || []).find((f) => String(f.id) === selectedProjectId) || null;
    }, [masterSheet?.firmObjects, selectedProjectId]);

    const filteredIndents = useMemo(() => {
        if (selectedProjectId === 'All') return indentSheet || [];
        const selId = Number(selectedProjectId);
        const selName = selectedFirm?.name?.trim().toLowerCase();
        return (indentSheet || []).filter((i: any) => {
            if (selId && Number(i.firm_id || i.firmId) === selId) return true;
            if (selName && (i.firmName || i.firm_name || i.firmNameMatch)?.trim().toLowerCase() === selName) return true;
            return false;
        });
    }, [indentSheet, selectedProjectId, selectedFirm?.name]);

    const filteredStoreIns = useMemo(() => {
        if (selectedProjectId === 'All') return storeInSheet || [];
        const selId = Number(selectedProjectId);
        const selName = selectedFirm?.name?.trim().toLowerCase();
        return (storeInSheet || []).filter((s: any) => {
            if (selId && Number(s.firm_id || s.firmId) === selId) return true;
            if (selName && (s.firmNameMatch || s.firm_name || s.firmName)?.trim().toLowerCase() === selName) return true;
            return false;
        });
    }, [storeInSheet, selectedProjectId, selectedFirm?.name]);

    const filteredIssues = useMemo(() => {
        if (selectedProjectId === 'All') return issueSheet || [];
        const selId = Number(selectedProjectId);
        const selName = selectedFirm?.name?.trim().toLowerCase();
        return (issueSheet || []).filter((is: any) => {
            if (selId && Number(is.firm_id || is.firmId) === selId) return true;
            if (selName && (is.projectName || is.firm_name || is.firmNameMatch)?.trim().toLowerCase() === selName) return true;
            return false;
        });
    }, [issueSheet, selectedProjectId, selectedFirm?.name]);

    const filteredTransfers = useMemo(() => {
        if (!stockTransferSheet) return [];
        if (selectedProjectId === 'All') return stockTransferSheet;
        const selId = Number(selectedProjectId);
        const selName = selectedFirm?.name?.trim().toLowerCase();
        return stockTransferSheet.filter((t: any) => {
            if (selId && (Number(t.from_firm_id || t.fromFirmId) === selId || Number(t.to_firm_id || t.toFirmId) === selId)) return true;
            if (selName && (
                (t.fromProject || t.from_project)?.trim().toLowerCase() === selName ||
                (t.toProject || t.to_project)?.trim().toLowerCase() === selName
            )) return true;
            return false;
        });
    }, [stockTransferSheet, selectedProjectId, selectedFirm?.name]);

    const partyOptions = useMemo(() => {
        const partySet = new Set<string>();

        (filteredStoreIns || []).forEach((s: any) => {
            const name = (
                s.vendorName ||
                s.vendor_name ||
                s.vendor ||
                s.party ||
                s.party_name ||
                (s as any).approved_party_name ||
                s.approvedVendorName ||
                s.approved_vendor_name ||
                ''
            ).trim();
            if (name && name !== 'N/A' && name !== '-' && name.toLowerCase() !== 'null' && name.toLowerCase() !== 'undefined') {
                partySet.add(name);
            }
        });

        (filteredIssues || []).forEach((is: any) => {
            const cName = (is.constructorName || is.constructor_name || '').trim();
            if (cName && cName !== 'N/A' && cName !== '-' && cName.toLowerCase() !== 'null' && cName.toLowerCase() !== 'undefined') {
                partySet.add(cName);
            }
            const rName = (is.returnPersonName || is.return_person_name || '').trim();
            if (rName && rName !== 'N/A' && rName !== '-' && rName.toLowerCase() !== 'null' && rName.toLowerCase() !== 'undefined') {
                partySet.add(rName);
            }
            const pName = (is.issuePersonName || is.issue_person_name || is.issueTo || is.issue_to || is.party || '').trim();
            if (pName && pName !== 'N/A' && pName !== '-' && pName.toLowerCase() !== 'null' && pName.toLowerCase() !== 'undefined') {
                partySet.add(pName);
            }
        });

        (filteredIndents || []).forEach((i: any) => {
            const indenter = (i.indenterName || i.indenter_name || i.party || '').trim();
            if (indenter && indenter !== 'N/A' && indenter !== '-' && indenter.toLowerCase() !== 'null' && indenter.toLowerCase() !== 'undefined') {
                partySet.add(indenter);
            }
            const vendor = (
                i.approvedVendorName ||
                i.approved_vendor_name ||
                i.vendorName ||
                i.vendor_name ||
                i.vendor ||
                (i as any).approved_party_name ||
                ''
            ).trim();
            if (vendor && vendor !== 'N/A' && vendor !== '-' && vendor.toLowerCase() !== 'null' && vendor.toLowerCase() !== 'undefined') {
                partySet.add(vendor);
            }
        });

        if (selectedProjectId === 'All') {
            (masterSheet?.vendorNames || []).forEach((v: string) => {
                const name = (v || '').trim();
                if (name) partySet.add(name);
            });
            (masterSheet?.contractors || []).forEach((c: any) => {
                const name = (c.contractorName || c.contractor_name || '').trim();
                if (name) partySet.add(name);
            });
        }

        return Array.from(partySet).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    }, [filteredStoreIns, filteredIssues, filteredIndents, selectedProjectId, masterSheet?.vendorNames, masterSheet?.contractors]);

    const partyFilteredIndents = useMemo(() => {
        if (selectedParty === 'All') return filteredIndents;
        const pLower = selectedParty.trim().toLowerCase();
        return (filteredIndents || []).filter((i: any) => {
            const indenter = (i.indenterName || i.indenter_name || i.party || '').trim().toLowerCase();
            const vendor = (
                i.approvedVendorName ||
                i.approved_vendor_name ||
                i.vendorName ||
                i.vendor_name ||
                i.vendor ||
                (i as any).approved_party_name ||
                ''
            ).trim().toLowerCase();
            return indenter === pLower || vendor === pLower;
        });
    }, [filteredIndents, selectedParty]);

    const partyFilteredStoreIns = useMemo(() => {
        if (selectedParty === 'All') return filteredStoreIns;
        const pLower = selectedParty.trim().toLowerCase();
        return (filteredStoreIns || []).filter((s: any) => {
            const vendor = (
                s.vendorName ||
                s.vendor_name ||
                s.vendor ||
                s.party ||
                s.party_name ||
                (s as any).approved_party_name ||
                s.approvedVendorName ||
                s.approved_vendor_name ||
                ''
            ).trim().toLowerCase();
            return vendor === pLower;
        });
    }, [filteredStoreIns, selectedParty]);

    const partyFilteredIssues = useMemo(() => {
        if (selectedParty === 'All') return filteredIssues;
        const pLower = selectedParty.trim().toLowerCase();
        return (filteredIssues || []).filter((is: any) => {
            const cName = (is.constructorName || is.constructor_name || '').trim().toLowerCase();
            const rName = (is.returnPersonName || is.return_person_name || '').trim().toLowerCase();
            const pName = (is.issuePersonName || is.issue_person_name || is.issueTo || is.issue_to || is.party || '').trim().toLowerCase();
            return cName === pLower || rName === pLower || pName === pLower;
        });
    }, [filteredIssues, selectedParty]);

    const partyFilteredTransfers = useMemo(() => {
        if (selectedParty === 'All') return filteredTransfers;
        const pLower = selectedParty.trim().toLowerCase();
        return (filteredTransfers || []).filter((t: any) => {
            const fromP = (t.fromProject || t.from_project || '').trim().toLowerCase();
            const toP = (t.toProject || t.to_project || '').trim().toLowerCase();
            return fromP === pLower || toP === pLower;
        });
    }, [filteredTransfers, selectedParty]);

    const tableData = useMemo(() => {
        const inventoryBase = inventorySheet || [];

        const permittedFirms = user?.firm_access || [];
        const filteredInventory = filterByFirmAccess(inventoryBase, permittedFirms, {
            id: (i: any) => i.firm_id
        });

        const selectedProjectName = selectedProjectId === 'All' ? 'All' : (selectedFirm?.name || 'All');

        let projectFilteredInventory = selectedProjectId === 'All'
            ? filteredInventory
            : filteredInventory.filter((i: any) => {
                const selId = Number(selectedProjectId);
                const selName = selectedFirm?.name?.trim().toLowerCase();
                if (selId && Number(i.firm_id || i.firmId) === selId) return true;
                if (selName && (i.firmName || i.firm_name || i.firmNameMatch)?.trim().toLowerCase() === selName) return true;
                return false;
            });

        const isPartyFiltered = selectedParty !== 'All';

        if (isPartyFiltered) {
            projectFilteredInventory = projectFilteredInventory.map(item => ({
                ...item,
                opening: 0
            }));
        }

        const calculated = calculateRealInventory(
            projectFilteredInventory,
            partyFilteredIndents,
            partyFilteredStoreIns,
            partyFilteredIssues,
            partyFilteredTransfers,
            selectedProjectName,
            isPartyFiltered
        ) as unknown as InventoryRecord[];

        let result = calculated;
        if (isPartyFiltered) {
            result = result.filter(item => {
                return (
                    (item.indented || 0) !== 0 ||
                    (item.approved || 0) !== 0 ||
                    (item.liftingQty || 0) !== 0 ||
                    (item.inTransit || 0) !== 0 ||
                    (item.outQuantity || 0) !== 0 ||
                    (item.purchaseReturn || 0) !== 0 ||
                    (item.issueReturn || 0) !== 0 ||
                    (item.stockTransferReceiving || 0) !== 0 ||
                    (item.stockTransferGiven || 0) !== 0
                );
            });
        }

        return [...result].sort((a, b) =>
            (a.itemName || '').localeCompare(b.itemName || '', undefined, { numeric: true, sensitivity: 'base' })
        );
    }, [inventorySheet, partyFilteredIndents, partyFilteredStoreIns, partyFilteredIssues, partyFilteredTransfers, selectedProjectId, selectedParty, selectedFirm?.name, user?.firm_access]);

    const isLoading = inventoryLoading || indentLoading || storeInLoading || issueLoading;

    const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>({
        date: true,
        refNo: true,
        party: true,
        quantity: true,
        rate: true,
        amount: true,
        projectName: true,
        siteLocation: true,
    });

    const [detailDialog, setDetailDialog] = useState<{
        open: boolean;
        title: string;
        rows: DetailRow[];
    }>({ open: false, title: '', rows: [] });

    const [dialogSearch, setDialogSearch] = useState('');

    const [transferDialog, setTransferDialog] = useState({
        open: false,
        fromProject: '',
        toProject: '',
        itemName: '',
        quantity: 0,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleDetailClick = useCallback((type: string, itemName: string, value: number) => {
        if (value === 0) return;

        let rows: DetailRow[] = [];
        let title = selectedParty !== 'All'
            ? `${type} History (${selectedParty}): ${itemName}`
            : `${type} History: ${itemName}`;

        // Get the current item's fallback rate / avgPrice
        const matchedItem = inventorySheet?.find(i => i.itemName === itemName);
        const itemFallbackRate = Number(matchedItem?.avgPrice || (matchedItem as any)?.individualRate || 0);

        const normalize = (val?: string) => (val || '').trim().toLowerCase();
        const isSameProduct = (prod?: string) => normalize(prod) === normalize(itemName);
        const isLifted = (s: any) => {
            const raw = s.materialDate ?? s.material_date;
            if (!raw) return false;
            const str = String(raw).trim().toLowerCase();
            return str !== '' && str !== 'null' && str !== 'undefined' && str !== '-' && str !== 'n/a';
        };

        switch (type) {
            case 'Indented':
                rows = partyFilteredIndents
                    .filter((i: any) => isSameProduct(i.productName || i.product))
                    .map((i: any) => {
                        const targetPo = i.poNumber || i.po_number;
                        const poMatch = poMasterSheet?.find((p: any) =>
                            Boolean(targetPo && p.poNumber && String(p.poNumber).trim() === String(targetPo).trim()) &&
                            isSameProduct(p.product || p.productName)
                        );
                        const rate = Number(
                            poMatch?.rate ||
                            i.approvedRate ||
                            i.approved_rate ||
                            i.rate ||
                            i.rate1 ||
                            i.negotiated_rate ||
                            i.price ||
                            itemFallbackRate ||
                            0
                        );
                        const quantity = Number(i.quantity || 0);
                        const party = (selectedParty !== 'All' && i.indenterName?.trim().toLowerCase() === selectedParty.trim().toLowerCase())
                            ? (i.indenterName || 'N/A')
                            : (i.approvedVendorName || i.approved_vendor_name || i.vendor || i.vendor_name || i.indenterName || 'N/A');
                        return {
                            date: i.timestamp,
                            refNo: i.indentNumber,
                            quantity,
                            rate,
                            amount: Number((quantity * rate).toFixed(2)),
                            party,
                            projectName: i.firmName || 'N/A'
                        };
                    });
                break;
            case 'Approved':
                rows = partyFilteredIndents
                    .filter((i: any) => isSameProduct(i.productName || i.product) && Number(i.approvedQuantity || 0) > 0)
                    .map((i: any) => {
                        const targetPo = i.poNumber || i.po_number;
                        const poMatch = poMasterSheet?.find((p: any) =>
                            Boolean(targetPo && p.poNumber && String(p.poNumber).trim() === String(targetPo).trim()) &&
                            isSameProduct(p.product || p.productName)
                        );
                        const rate = Number(
                            poMatch?.rate ||
                            i.approvedRate ||
                            i.approved_rate ||
                            i.rate ||
                            i.rate1 ||
                            i.negotiated_rate ||
                            i.price ||
                            itemFallbackRate ||
                            0
                        );
                        const quantity = Number(i.approvedQuantity || 0);
                        const party = (selectedParty !== 'All' && i.indenterName?.trim().toLowerCase() === selectedParty.trim().toLowerCase())
                            ? (i.indenterName || 'N/A')
                            : (i.approvedVendorName || i.approved_vendor_name || i.vendor || i.vendor_name || i.indenterName || 'N/A');
                        return {
                            date: i.timestamp,
                            refNo: i.indentNumber,
                            quantity,
                            rate,
                            amount: Number((quantity * rate).toFixed(2)),
                            party,
                            projectName: i.firmName || 'N/A'
                        };
                    });
                break;
            case 'Lifting Quantity':
                rows = partyFilteredStoreIns
                    .filter((s: any) => isSameProduct(s.productName || s.product) && Number(s.receivedQuantity || 0) > 0 && isLifted(s))
                    .map((s: any) => {
                        // Find indent specifically for this product and indent/PO
                        const matchedIndent: any = (partyFilteredIndents || []).find((ind: any) => {
                            const prodMatch = isSameProduct(ind.productName || ind.product);
                            const indentMatch = Boolean(s.indentNo && ind.indentNumber && String(ind.indentNumber).trim() === String(s.indentNo).trim());
                            const poMatchNum = Boolean(s.poNumber && ind.poNumber && String(ind.poNumber).trim() === String(s.poNumber).trim());
                            return prodMatch && (indentMatch || poMatchNum);
                        });

                        // Find PO created for this indent/lift data and product
                        const targetPoNumber = s.poNumber || s.po_number || matchedIndent?.poNumber || matchedIndent?.po_number;
                        const poMatch = poMasterSheet?.find((p: any) => {
                            const poNumMatch = Boolean(targetPoNumber && p.poNumber && String(p.poNumber).trim() === String(targetPoNumber).trim());
                            const prodMatch = isSameProduct(p.product || p.productName);
                            return poNumMatch && prodMatch;
                        });

                        // Take rate strictly from the PO created for this indent/lift data
                        const poRate = Number(
                            poMatch?.rate ||
                            matchedIndent?.approvedRate ||
                            matchedIndent?.approved_rate ||
                            s.priceAsPerPo ||
                            s.rate ||
                            matchedIndent?.rate ||
                            matchedIndent?.rate1 ||
                            itemFallbackRate ||
                            0
                        );
                        const quantity = Number(s.receivedQuantity || 0);
                        return {
                            date: s.materialDate || s.material_date || '',
                            refNo: s.billNo || s.liftNumber,
                            quantity,
                            rate: poRate,
                            amount: Number((quantity * poRate).toFixed(2)),
                            party: s.vendorName || s.vendor_name || s.vendor || s.approvedVendorName || (s as any).approved_party_name || 'N/A',
                            projectName: s.firmNameMatch || 'N/A',
                            siteLocation: s.location || 'N/A'
                        };
                    });
                break;
            case 'In Transit':
                rows = partyFilteredStoreIns
                    .filter((s: any) => {
                        const liftedQty = isLifted(s) ? Number(s.receivedQuantity || 0) : 0;
                        return isSameProduct(s.productName || s.product) && (Number(s.qty || 0) - liftedQty) > 0;
                    })
                    .map((s: any) => {
                        const matchedIndent: any = (partyFilteredIndents || []).find((ind: any) => {
                            const prodMatch = isSameProduct(ind.productName || ind.product);
                            const indentMatch = Boolean(s.indentNo && ind.indentNumber && String(ind.indentNumber).trim() === String(s.indentNo).trim());
                            const poMatchNum = Boolean(s.poNumber && ind.poNumber && String(ind.poNumber).trim() === String(s.poNumber).trim());
                            return prodMatch && (indentMatch || poMatchNum);
                        });

                        const targetPoNumber = s.poNumber || s.po_number || matchedIndent?.poNumber || matchedIndent?.po_number;
                        const poMatch = poMasterSheet?.find((p: any) => {
                            const poNumMatch = Boolean(targetPoNumber && p.poNumber && String(p.poNumber).trim() === String(targetPoNumber).trim());
                            const prodMatch = isSameProduct(p.product || p.productName);
                            return poNumMatch && prodMatch;
                        });

                        const poRate = Number(
                            poMatch?.rate ||
                            matchedIndent?.approvedRate ||
                            matchedIndent?.approved_rate ||
                            s.priceAsPerPo ||
                            s.rate ||
                            matchedIndent?.rate ||
                            matchedIndent?.rate1 ||
                            itemFallbackRate ||
                            0
                        );
                        const liftedQty = isLifted(s) ? Number(s.receivedQuantity || 0) : 0;
                        const quantity = Number(s.qty || 0) - liftedQty;
                        return {
                            date: s.timestamp,
                            refNo: s.billNo || s.liftNumber,
                            quantity,
                            rate: poRate,
                            amount: Number((quantity * poRate).toFixed(2)),
                            party: s.vendorName || s.vendor_name || s.vendor || s.approvedVendorName || (s as any).approved_party_name || 'N/A',
                            projectName: s.firmNameMatch || 'N/A',
                            siteLocation: s.location || 'N/A'
                        };
                    });
                break;
            case 'Issued':
                rows = partyFilteredIssues
                    .filter((is: any) => isSameProduct(is.productName || is.product) && Number(is.givenQty || 0) > 0)
                    .map((is: any) => {
                        const quantity = Number(is.givenQty || 0);
                        return {
                            date: is.planned1 || is.timestamp,
                            refNo: is.issueNo,
                            quantity,
                            rate: itemFallbackRate,
                            amount: Number((quantity * itemFallbackRate).toFixed(2)),
                            party: is.constructorName || is.constructor_name || is.issuePersonName || is.issue_person_name || is.issueTo || is.party || 'N/A',
                            projectName: is.projectName || is.firm_name || 'N/A',
                        };
                    });
                break;
            case 'Issue Return':
                rows = partyFilteredIssues
                    .filter((is: any) => isSameProduct(is.productName || is.product) && Number(is.rejected_damage_qty || 0) > 0)
                    .map((is: any) => {
                        const quantity = Number(is.rejected_damage_qty || 0);
                        return {
                            date: is.timestamp,
                            refNo: is.issueNo,
                            quantity,
                            rate: itemFallbackRate,
                            amount: Number((quantity * itemFallbackRate).toFixed(2)),
                            party: is.returnPersonName || is.return_person_name || is.constructorName || is.party || 'N/A',
                            projectName: is.projectName || is.firm_name || 'N/A',
                            siteLocation: is.siteLocation || 'N/A'
                        };
                    });
                break;
            case 'Purchase Return':
                rows = partyFilteredStoreIns
                    .filter((s: any) => isSameProduct(s.productName || s.product) && Number(s.returnQuantity || 0) > 0)
                    .map((s: any) => {
                        const matchedIndent: any = (partyFilteredIndents || []).find((ind: any) => {
                            const prodMatch = isSameProduct(ind.productName || ind.product);
                            const indentMatch = Boolean(s.indentNo && ind.indentNumber && String(ind.indentNumber).trim() === String(s.indentNo).trim());
                            const poMatchNum = Boolean(s.poNumber && ind.poNumber && String(ind.poNumber).trim() === String(s.poNumber).trim());
                            return prodMatch && (indentMatch || poMatchNum);
                        });

                        const targetPoNumber = s.poNumber || s.po_number || matchedIndent?.poNumber || matchedIndent?.po_number;
                        const poMatch = poMasterSheet?.find((p: any) => {
                            const poNumMatch = Boolean(targetPoNumber && p.poNumber && String(p.poNumber).trim() === String(targetPoNumber).trim());
                            const prodMatch = isSameProduct(p.product || p.productName);
                            return poNumMatch && prodMatch;
                        });

                        const poRate = Number(
                            poMatch?.rate ||
                            matchedIndent?.approvedRate ||
                            matchedIndent?.approved_rate ||
                            s.priceAsPerPo ||
                            s.rate ||
                            matchedIndent?.rate ||
                            matchedIndent?.rate1 ||
                            itemFallbackRate ||
                            0
                        );
                        const quantity = Number(s.returnQuantity || 0);
                        return {
                            date: s.timestamp,
                            refNo: s.billNo || s.liftNumber,
                            quantity,
                            rate: poRate,
                            amount: Number((quantity * poRate).toFixed(2)),
                            party: s.vendorName || s.vendor_name || s.vendor || s.approvedVendorName || (s as any).approved_party_name || 'N/A',
                            projectName: s.firmNameMatch || 'N/A',
                            siteLocation: s.location || 'N/A'
                        };
                    });
                break;
            case 'Stock Transfer Receiving':
                // Combine transfers from both dedicated table and old store_in 'Transfer' status
                const legacyTransfers = partyFilteredStoreIns
                    .filter((s: any) => isSameProduct(s.productName || s.product) && s.receivingStatus === 'Transfer')
                    .map((s: any) => {
                        const qty = Number(s.receivedQuantity || 0);
                        return {
                            date: s.timestamp,
                            refNo: s.billNo || s.liftNumber,
                            quantity: qty,
                            rate: itemFallbackRate,
                            amount: Number((qty * itemFallbackRate).toFixed(2)),
                            party: s.vendorName || s.vendor_name || s.vendor || s.approvedVendorName || (s as any).approved_party_name || 'N/A',
                            projectName: s.firmNameMatch || 'N/A',
                            siteLocation: s.location || 'N/A'
                        };
                    });

                const newTransfersReceiving = partyFilteredTransfers
                    .filter((t: any) => isSameProduct(t.productName || t.product) && (selectedProjectId === 'All' || Number(t.to_firm_id || t.toFirmId) === Number(selectedProjectId)))
                    .map((t: any) => {
                        const qty = Number(t.quantity || 0);
                        return {
                            date: t.timestamp,
                            refNo: t.transferNo,
                            quantity: qty,
                            rate: itemFallbackRate,
                            amount: Number((qty * itemFallbackRate).toFixed(2)),
                            party: t.fromProject,
                            projectName: t.toProject || 'N/A'
                        };
                    });

                rows = [...legacyTransfers, ...newTransfersReceiving];
                break;
            case 'Stock Transfer Given':
                rows = partyFilteredTransfers
                    .filter((t: any) => isSameProduct(t.productName || t.product) && (selectedProjectId === 'All' || Number(t.from_firm_id || t.fromFirmId) === Number(selectedProjectId)))
                    .map((t: any) => {
                        const qty = Number(t.quantity || 0);
                        return {
                            date: t.timestamp,
                            refNo: t.transferNo,
                            quantity: qty,
                            rate: itemFallbackRate,
                            amount: Number((qty * itemFallbackRate).toFixed(2)),
                            party: t.fromProject,
                            projectName: t.toProject || 'N/A'
                        };
                    });
                break;
        }

        setDetailDialog({ open: true, title, rows: rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) });
    }, [partyFilteredIndents, partyFilteredStoreIns, partyFilteredIssues, partyFilteredTransfers, inventorySheet, poMasterSheet, selectedProjectId, selectedParty]);

    const ClickableCell = useMemo(() => ({ value, label, row }: { value: number; label: string; row: any }) => (
        <button
            onClick={() => handleDetailClick(label, row.original.itemName, value)}
            className={`w-full text-center hover:underline hover:text-primary transition-colors ${value > 0 ? 'text-blue-600 font-medium cursor-pointer' : 'text-muted-foreground'}`}
            disabled={value === 0}
        >
            {value}
        </button>
    ), [handleDetailClick]);

    const columns = useMemo<ColumnDef<InventoryRecord>[]>(() => [
        {
            accessorKey: 'itemName',
            header: 'Item',
            cell: ({ row }) => {
                return (
                    <div className="text-wrap max-w-40 text-center">{row.original.itemName}</div>
                );
            },
        },
        { accessorKey: 'groupHead', header: 'Group Head' },
        { accessorKey: 'uom', header: 'UOM' },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => {
                const code = (row.original.status || '').toLowerCase();
                if ((row.original.current || 0) === 0) {
                    return <Pill variant="reject">Out of Stock</Pill>;
                }
                if (code === 'red') {
                    return <Pill variant="pending">Low Stock</Pill>;
                }
                if (code === 'purple') {
                    return <Pill variant="primary">Excess</Pill>;
                }
                return <Pill variant="secondary">In Stock</Pill>;
            },
        },
        {
            accessorKey: 'indented',
            header: 'Indented',
            cell: ({ row }) => <ClickableCell value={row.original.indented} label="Indented" row={row} />
        },
        {
            accessorKey: 'approved',
            header: 'Approved',
            cell: ({ row }) => <ClickableCell value={row.original.approved} label="Approved" row={row} />
        },
        {
            accessorKey: 'purchaseReturn',
            header: 'Purchase Return',
            cell: ({ row }) => <ClickableCell value={row.original.purchaseReturn} label="Purchase Return" row={row} />
        },
        {
            accessorKey: 'liftingQty',
            header: 'Lifting Quantity',
            cell: ({ row }) => <ClickableCell value={row.original.liftingQty} label="Lifting Quantity" row={row} />
        },
        {
            accessorKey: 'inTransit',
            header: 'In Transit',
            cell: ({ row }) => <ClickableCell value={row.original.inTransit} label="In Transit" row={row} />
        },
        {
            accessorKey: 'issueReturn',
            header: 'Issue Return',
            cell: ({ row }) => <ClickableCell value={row.original.issueReturn} label="Issue Return" row={row} />
        },
        {
            accessorKey: 'outQuantity',
            header: 'Issued',
            cell: ({ row }) => <ClickableCell value={row.original.outQuantity} label="Issued" row={row} />
        },
        {
            accessorKey: 'stockTransferGiven',
            header: 'S.T. To',
            cell: ({ row }) => (
                <div className="flex flex-col items-center gap-0.5">
                    <ClickableCell value={row.original.stockTransferGiven} label="Stock Transfer Given" row={row} />
                    {row.original.toProject && (
                        <span className="text-[10px] leading-tight text-muted-foreground truncate max-w-[100px]" title={row.original.toProject}>
                            To: {row.original.toProject}
                        </span>
                    )}
                </div>
            )
        },
        {
            accessorKey: 'stockTransferReceiving',
            header: 'S.T. From',
            cell: ({ row }) => (
                <div className="flex flex-col items-center gap-0.5">
                    <ClickableCell value={row.original.stockTransferReceiving} label="Stock Transfer Receiving" row={row} />
                    {row.original.fromProject && (
                        <span className="text-[10px] leading-tight text-muted-foreground truncate max-w-[100px]" title={row.original.fromProject}>
                            From: {row.original.fromProject}
                        </span>
                    )}
                </div>
            )
        },
        { accessorKey: 'current', header: 'Quantity' },
        {
            accessorKey: 'avgPrice',
            header: 'Avg Price',
            cell: ({ row }) => {
                const val = row.original.avgPrice ?? (row.original as any).individualRate ?? 0;
                return <>&#8377;{val}</>;
            },
        },
        {
            accessorKey: 'totalPrice',
            header: 'Total Price',

            cell: ({ row }) => {
                return <>&#8377;{row.original.totalPrice}</>;
            },
        },
    ], [ClickableCell]);

    return (
        <div>
            <Heading
                heading="Inventory"
                subtext="View inventory"
                action={
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-4 w-full sm:w-auto">
                        <Button
                            onClick={() => setTransferDialog(prev => ({ ...prev, open: true, fromProject: '', toProject: '', itemName: '', quantity: 0 }))}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20 flex items-center justify-center gap-2 h-9 text-xs sm:text-sm rounded-xl w-full sm:w-auto"
                        >
                            <ArrowRightLeft className="size-4" />
                            <span>Stock Transfer</span>
                        </Button>
                        <div className="hidden sm:block h-6 w-px bg-border/60" />
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <span className="text-xs sm:text-sm font-semibold text-muted-foreground shrink-0">Project:</span>
                            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                                <SelectTrigger className="w-full sm:w-[200px] h-9 text-xs sm:text-sm rounded-xl bg-background">
                                    <SelectValue placeholder="Select Project" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="All">All Projects</SelectItem>
                                    {(masterSheet?.firmObjects || [])
                                        .map((firm) => (
                                            <SelectItem key={firm.id} value={String(firm.id)}>
                                                {firm.name}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="hidden sm:block h-6 w-px bg-border/60" />
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <span className="text-xs sm:text-sm font-semibold text-muted-foreground shrink-0">Party/Person:</span>
                            <Select value={selectedParty} onValueChange={setSelectedParty}>
                                <SelectTrigger className="w-full sm:w-[220px] h-9 text-xs sm:text-sm rounded-xl bg-background">
                                    <SelectValue placeholder="All Parties/Persons" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                    <SelectItem value="All">All Parties/Persons</SelectItem>
                                    {partyOptions.map((party) => (
                                        <SelectItem key={party} value={party}>
                                            {party}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                }
            >
                <Store size={50} className="text-primary" />
            </Heading>

            <DataTable
                data={tableData}
                columns={columns}
                dataLoading={isLoading}
                searchFields={['itemName', 'firmName', 'groupHead', 'uom', 'status']}
                className="h-[80dvh]"
            />

            <Dialog open={detailDialog.open} onOpenChange={(open) => { setDetailDialog(prev => ({ ...prev, open })); if (!open) setDialogSearch(''); }}>
                <DialogContent className="max-w-[95vw] lg:max-w-[90vw] xl:max-w-[1400px] max-h-[90dvh] flex flex-col">
                    <DialogHeader className="flex flex-row items-center justify-between space-x-4">
                        <DialogTitle className="shrink-0">{detailDialog.title}</DialogTitle>
                        {(detailDialog.title.includes('Lifting Quantity') || detailDialog.title.startsWith('Issued History')) && (
                            <div className="relative flex-1 max-w-xs">
                                <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search by ref, party, project..."
                                    value={dialogSearch}
                                    onChange={e => setDialogSearch(e.target.value)}
                                    className="h-8 pl-7 text-sm"
                                />
                            </div>
                        )}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="ml-auto flex h-8 items-center gap-1 px-2 text-xs">
                                    <Settings2 size={14} />
                                    <span>View Columns</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuCheckboxItem
                                    checked={visibleCols.date}
                                    onCheckedChange={(checked) => setVisibleCols(v => ({ ...v, date: !!checked }))}
                                >
                                    Date
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuCheckboxItem
                                    checked={visibleCols.refNo}
                                    onCheckedChange={(checked) => setVisibleCols(v => ({ ...v, refNo: !!checked }))}
                                >
                                    Reference
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuCheckboxItem
                                    checked={visibleCols.party}
                                    onCheckedChange={(checked) => setVisibleCols(v => ({ ...v, party: !!checked }))}
                                >
                                    Party/Person
                                </DropdownMenuCheckboxItem>

                                <DropdownMenuCheckboxItem
                                    checked={visibleCols.quantity}
                                    onCheckedChange={(checked) => setVisibleCols(v => ({ ...v, quantity: !!checked }))}
                                >
                                    Quantity
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuCheckboxItem
                                    checked={visibleCols.rate}
                                    onCheckedChange={(checked) => setVisibleCols(v => ({ ...v, rate: !!checked }))}
                                >
                                    Rate
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuCheckboxItem
                                    checked={visibleCols.amount}
                                    onCheckedChange={(checked) => setVisibleCols(v => ({ ...v, amount: !!checked }))}
                                >
                                    Amount
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuCheckboxItem
                                    checked={visibleCols.projectName}
                                    onCheckedChange={(checked) => setVisibleCols(v => ({ ...v, projectName: !!checked }))}
                                >
                                    Project Name
                                </DropdownMenuCheckboxItem>
                                {!detailDialog.title.startsWith('Issued History') && (
                                    <DropdownMenuCheckboxItem
                                        checked={visibleCols.siteLocation}
                                        onCheckedChange={(checked) => setVisibleCols(v => ({ ...v, siteLocation: !!checked }))}
                                    >
                                        Site Location
                                    </DropdownMenuCheckboxItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </DialogHeader>
                    {(() => {
                        const q = dialogSearch.toLowerCase();
                        const isSearchable = detailDialog.title.includes('Lifting Quantity') || detailDialog.title.startsWith('Issued History');
                        const visibleRows = isSearchable && q
                            ? detailDialog.rows.filter(row =>
                                row.refNo?.toLowerCase().includes(q) ||
                                row.party?.toLowerCase().includes(q) ||
                                row.projectName?.toLowerCase().includes(q) ||
                                row.siteLocation?.toLowerCase().includes(q)
                            )
                            : detailDialog.rows;
                        const totalQty = visibleRows.reduce((sum, r) => sum + (r.quantity || 0), 0);
                        const totalAmount = visibleRows.reduce((sum, r) => sum + (r.amount || 0), 0);
                        return (
                            <>
                                <div className="flex-1 overflow-auto mt-4 border rounded-lg">
                                    <Table className="min-w-[900px]">
                                        <TableHeader>
                                            <TableRow>
                                                {visibleCols.date && <TableHead>Date</TableHead>}
                                                {visibleCols.refNo && <TableHead>Reference</TableHead>}
                                                {visibleCols.party && (
                                                    <TableHead>{detailDialog.title.includes('Stock Transfer') ? 'From' : 'Party/Person'}</TableHead>
                                                )}
                                                {visibleCols.projectName && (
                                                    <TableHead>{detailDialog.title.includes('Stock Transfer') ? 'To' : 'Project'}</TableHead>
                                                )}
                                                {visibleCols.siteLocation && !detailDialog.title.startsWith('Issued History') && <TableHead>Site Location</TableHead>}
                                                {visibleCols.quantity && <TableHead className="text-right">Qty</TableHead>}
                                                {visibleCols.rate && <TableHead className="text-right">Rate</TableHead>}
                                                {visibleCols.amount && <TableHead className="text-right">Amount</TableHead>}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {visibleRows.length > 0 ? (
                                                visibleRows.map((row, idx) => (
                                                    <TableRow key={idx}>
                                                        {visibleCols.date && (
                                                            <TableCell className="whitespace-nowrap italic">
                                                                {row.date
                                                                    ? (() => {
                                                                        const dStr = String(row.date).trim();
                                                                        if (dStr.includes('/')) return dStr;
                                                                        const d = new Date(dStr);
                                                                        return !isNaN(d.getTime())
                                                                            ? format(
                                                                                d,
                                                                                detailDialog.title.includes('Lifting Quantity') ? 'dd/MM/yyyy' : 'dd/MM/yyyy HH:mm'
                                                                            )
                                                                            : dStr;
                                                                    })()
                                                                    : 'N/A'}
                                                            </TableCell>
                                                        )}
                                                        {visibleCols.refNo && <TableCell className="font-mono text-sm whitespace-nowrap">{row.refNo}</TableCell>}
                                                        {visibleCols.party && <TableCell className="whitespace-nowrap">{row.party}</TableCell>}
                                                        {visibleCols.projectName && <TableCell className="whitespace-nowrap">{row.projectName}</TableCell>}
                                                        {visibleCols.siteLocation && !detailDialog.title.startsWith('Issued History') && <TableCell className="whitespace-nowrap">{row.siteLocation || 'N/A'}</TableCell>}
                                                        {visibleCols.quantity && <TableCell className="text-right font-bold">{row.quantity}</TableCell>}
                                                        {visibleCols.rate && (
                                                            <TableCell className="text-right font-medium whitespace-nowrap text-blue-600">
                                                                {row.rate ? `₹${row.rate.toLocaleString('en-IN')}` : '₹0'}
                                                            </TableCell>
                                                        )}
                                                        {visibleCols.amount && (
                                                            <TableCell className="text-right font-bold whitespace-nowrap text-emerald-600">
                                                                {row.amount ? `₹${row.amount.toLocaleString('en-IN')}` : '₹0'}
                                                            </TableCell>
                                                        )}
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground italic">
                                                        No transactions found
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                                <div className="flex justify-end items-center gap-6 pt-2 text-sm border-t mt-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground">Total Qty:</span>
                                        <span className="font-bold text-base">{totalQty.toLocaleString('en-IN')}</span>
                                    </div>
                                    {visibleCols.amount && totalAmount > 0 && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-muted-foreground">Total Amount:</span>
                                            <span className="font-bold text-base text-emerald-600">₹{totalAmount.toLocaleString('en-IN')}</span>
                                        </div>
                                    )}
                                </div>
                            </>
                        );
                    })()}
                </DialogContent>
            </Dialog>

            <Dialog open={transferDialog.open} onOpenChange={(open) => setTransferDialog(prev => ({ ...prev, open }))}>
                <DialogContent className="max-w-[95vw] sm:max-w-[600px] max-h-[90dvh] flex flex-col p-0 overflow-hidden rounded-2xl">
                    <div className="h-2 w-full bg-gradient-to-r from-primary to-primary/60" />
                    <div className="p-6 space-y-6 flex-1 overflow-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                                <ArrowRightLeft className="text-primary" size={24} />
                                Stock Transfer
                            </DialogTitle>
                        </DialogHeader>

                        <div className="grid gap-6 pb-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                        <Building2 size={12} /> From Project
                                    </Label>
                                    <Select
                                        value={transferDialog.fromProject}
                                        onValueChange={(val) => setTransferDialog(prev => ({ ...prev, fromProject: val, itemName: '', quantity: 0 }))}
                                    >
                                        <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
                                        <SelectContent>
                                            {masterSheet?.firms?.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                        <Building2 size={12} /> To Project
                                    </Label>
                                    <Select
                                        value={transferDialog.toProject}
                                        onValueChange={(val) => setTransferDialog(prev => ({ ...prev, toProject: val }))}
                                    >
                                        <SelectTrigger><SelectValue placeholder="Destination" /></SelectTrigger>
                                        <SelectContent>
                                            {(masterSheet?.firms || [])
                                                .filter(f => f !== transferDialog.fromProject)
                                                .map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)
                                            }
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                    <Package size={12} /> Select Item
                                </Label>
                                <Select
                                    value={transferDialog.itemName}
                                    onValueChange={(val) => setTransferDialog(prev => ({ ...prev, itemName: val }))}
                                    disabled={!transferDialog.fromProject}
                                >
                                    <SelectTrigger><SelectValue placeholder={transferDialog.fromProject ? "Select Item" : "Select Source First"} /></SelectTrigger>
                                    <SelectContent>
                                        {(() => {
                                            const fromFirmId = masterSheet?.firmObjects?.find((f) => f.name === transferDialog.fromProject)?.id;
                                            const sourceInv = calculateRealInventory(
                                                inventorySheet || [],
                                                (indentSheet || []).filter((i: any) => Number(i.firm_id || i.firmId) === fromFirmId),
                                                (storeInSheet || []).filter((s: any) => Number(s.firm_id || s.firmId) === fromFirmId),
                                                (issueSheet || []).filter((is: any) => Number(is.firm_id || is.firmId) === fromFirmId),
                                                (stockTransferSheet || []).filter((t: any) => t.toProject === transferDialog.fromProject || t.fromProject === transferDialog.fromProject),
                                                transferDialog.fromProject
                                            );
                                            return sourceInv.filter(i => (i.current || 0) > 0).map(i => (
                                                <SelectItem key={i.itemName} value={i.itemName}>{i.itemName} ({i.current} {i.uom} available)</SelectItem>
                                            ));
                                        })()}
                                    </SelectContent>
                                </Select>
                            </div>

                            {transferDialog.itemName && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 items-end animate-in slide-in-from-top-2 duration-300">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quantity</Label>
                                        <Input
                                            type="number"
                                            step="any"
                                            value={transferDialog.quantity || ''}
                                            onChange={(e) => setTransferDialog(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <Button
                                        className="w-full font-bold h-10 shadow-lg shadow-primary/20"
                                        disabled={isSubmitting || !transferDialog.quantity || !transferDialog.toProject}
                                        onClick={async () => {
                                            setIsSubmitting(true);
                                            try {
                                                const fromFirmId = masterSheet?.firmObjects?.find((f) => f.name === transferDialog.fromProject)?.id;
                                                const toFirmId = masterSheet?.firmObjects?.find((f) => f.name === transferDialog.toProject)?.id;
                                                const sourceInv = calculateRealInventory(
                                                    inventorySheet || [],
                                                    (indentSheet || []).filter((i: any) => Number(i.firm_id || i.firmId) === fromFirmId),
                                                    (storeInSheet || []).filter((s: any) => Number(s.firm_id || s.firmId) === fromFirmId),
                                                    (issueSheet || []).filter((is: any) => Number(is.firm_id || is.firmId) === fromFirmId),
                                                    (stockTransferSheet || []).filter((t: any) => t.toProject === transferDialog.fromProject || t.fromProject === transferDialog.fromProject),
                                                    transferDialog.fromProject
                                                );
                                                const selected = sourceInv.find(i => i.itemName === transferDialog.itemName);
                                                if (selected && transferDialog.quantity > selected.current) {
                                                    toast.error("Insufficient stock!");
                                                    return;
                                                }

                                                const timestamp = new Date().toISOString();
                                                const ref = `TRF-${Date.now()}`;

                                                if (!fromFirmId || !toFirmId) {
                                                    toast.error("Project ID is missing for this transfer.");
                                                    return;
                                                }

                                                // Insert into dedicated stock_transfers table
                                                await storeApi.insert('stock_transfers', [{
                                                    transfer_no: ref,
                                                    from_project: transferDialog.fromProject,
                                                    from_firm_id: fromFirmId,
                                                    to_project: transferDialog.toProject,
                                                    to_firm_id: toFirmId,
                                                    product_name: transferDialog.itemName,
                                                    uom: selected?.uom,
                                                    group_head: selected?.groupHead || '',
                                                    quantity: transferDialog.quantity,
                                                    remark: 'Internal Stock Transfer',
                                                    timestamp
                                                }]);

                                                toast.success("Transfer Successful!");
                                                setTransferDialog(prev => ({ ...prev, open: false, itemName: '', quantity: 0, toProject: '' }));
                                                updateStockTransferSheet(true);
                                            } catch (err: any) {
                                                toast.error("Error: " + err.message);
                                            } finally {
                                                setIsSubmitting(false);
                                            }
                                        }}
                                    >
                                        {isSubmitting ? "Processing..." : <><Send size={16} className="mr-2" /> Confirm</>}
                                    </Button>
                                </div>
                            )}

                            <Card className="bg-primary/5 border-primary/20">
                                <CardContent className="p-3 text-[11px] text-muted-foreground flex gap-2 items-start">
                                    <Info size={14} className="text-primary shrink-0 mt-0.5" />
                                    <p>This action will deduct quantity from the source project and record an incoming transfer for the destination project.</p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};
