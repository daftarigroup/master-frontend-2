import type { InventorySheet, IndentSheet, StoreInSheet, IssueSheet } from '../types/sheets';

/**
 * Calculates real-time inventory metrics by aggregating transactional data
 * across Indents, Store-Ins, Issues, and Stock Transfers.
 */
export function calculateRealInventory(
    inventoryMaster: InventorySheet[],
    indents: IndentSheet[],
    storeIns: StoreInSheet[],
    issues: IssueSheet[],
    transfers: any[] = [],
    currentProject: string = 'All',
    isPartyFilteredOrPoMaster: boolean | any[] = false,
    poMasterArg: any[] = []
): InventorySheet[] {
    const isPartyFiltered = typeof isPartyFilteredOrPoMaster === 'boolean' ? isPartyFilteredOrPoMaster : false;
    const poMaster = Array.isArray(isPartyFilteredOrPoMaster) ? isPartyFilteredOrPoMaster : (poMasterArg || []);

    const curProjLower = (currentProject || 'All').trim().toLowerCase();
    const isAllProjects = curProjLower === 'all' || !currentProject;

    // Helper to check if a record matches the current project
    const matchesProject = (firmName?: string, firmId?: any) => {
        if (isAllProjects) return true;
        if (firmName && firmName.trim().toLowerCase() === curProjLower) return true;
        if (firmId && String(firmId) === currentProject) return true;
        return false;
    };

    // Filter transaction data to current project if specified
    const projectIndents = isAllProjects
        ? indents
        : indents.filter(i => matchesProject(i.firmName || (i as any).firm_name || (i as any).firmNameMatch, i.firm_id || (i as any).firmId));

    const projectStoreIns = isAllProjects
        ? storeIns
        : storeIns.filter(s => matchesProject(s.firmNameMatch || (s as any).firm_name || (s as any).firmName, (s as any).firm_id || (s as any).firmId));

    const projectIssues = isAllProjects
        ? issues
        : issues.filter(is => matchesProject(is.projectName || (is as any).firm_name || (is as any).firmNameMatch, (is as any).firm_id || (is as any).firmId));

    const projectMaster = isAllProjects
        ? inventoryMaster
        : inventoryMaster.filter(r => matchesProject(r.firmName || (r as any).firm_name || (r as any).firmNameMatch, (r as any).firm_id || (r as any).firmId));

    // 1. Group transactions by product name for efficient lookup
    const indentSummary = groupAndSum(projectIndents, 'productName', ['quantity', 'approvedQuantity']);
    
    const storeInDetailed = projectStoreIns.reduce((acc, s) => {
        const key = (s.productName || '').trim();
        if (!key) return acc;
        if (!acc[key]) {
            acc[key] = { liftingQty: 0, stockTransfer: 0, purchaseQuantity: 0, purchaseReturn: 0 };
        }
        const recQty = Number(s.receivedQuantity || 0);
        const retQty = Number(s.returnQuantity || 0);
        const billQty = Number(s.quantityAsPerBill || s.qty || 0);
        
        // Purchase quantity is the ordered/billed quantity intended for store
        acc[key].purchaseQuantity += billQty;
        acc[key].purchaseReturn += retQty;

        if (s.receivingStatus === 'Transfer') {
            acc[key].stockTransfer += recQty;
        } else {
            // Check if item has been physically lifted/received at site
            const rawMatDate = s.materialDate ?? (s as any).material_date;
            const hasMaterialDate = rawMatDate != null && String(rawMatDate).trim() !== '' && 
                                   String(rawMatDate).trim().toLowerCase() !== 'null' && 
                                   String(rawMatDate).trim().toLowerCase() !== 'undefined' &&
                                   String(rawMatDate).trim().toLowerCase() !== '-' &&
                                   String(rawMatDate).trim().toLowerCase() !== 'n/a';
            if (hasMaterialDate && recQty > 0) {
                acc[key].liftingQty += recQty;
            }
        }
        return acc;
    }, {} as Record<string, { liftingQty: number; stockTransfer: number; purchaseQuantity: number; purchaseReturn: number }>);
    
    const issueSummary = groupAndSum(projectIssues, 'productName', ['givenQty', 'rejected_damage_qty']);

    const transferSummary = transfers.reduce((acc, t) => {
        const key = (t.productName || '').trim();
        if (!key) return acc;
        if (!acc[key]) {
            acc[key] = { in: 0, out: 0, totalVolume: 0, sources: new Set<string>(), destinations: new Set<string>() };
        }
        const qty = Number(t.quantity || 0);
        if (qty > 0) {
            acc[key].totalVolume += qty;
            const toProjLower = (t.toProject || '').trim().toLowerCase();
            const fromProjLower = (t.fromProject || '').trim().toLowerCase();
            const toFirmIdStr = String(t.to_firm_id || t.toFirmId || '');
            const fromFirmIdStr = String(t.from_firm_id || t.fromFirmId || '');

            if (toProjLower === curProjLower || toFirmIdStr === currentProject) {
                acc[key].in += qty;
                if (t.fromProject) acc[key].sources.add(t.fromProject);
            }
            if (fromProjLower === curProjLower || fromFirmIdStr === currentProject) {
                acc[key].out += qty;
                if (t.toProject) acc[key].destinations.add(t.toProject);
            }
        }
        return acc;
    }, {} as Record<string, { in: number; out: number; totalVolume: number; sources: Set<string>; destinations: Set<string> }>);

    // 1. Collect ALL unique item names involved with the project (or all projects)
    // When filtering by party/person, do NOT inject global projectMaster items that have no transactions for this party
    const allItemNames = new Set([
        ...(isPartyFiltered ? [] : projectMaster.map(i => (i.itemName || '').trim())),
        ...Object.keys(indentSummary),
        ...Object.keys(storeInDetailed),
        ...Object.keys(issueSummary),
        ...Object.keys(transferSummary)
    ]);

    // Sort alphabetically by default for clean and deterministic presentation
    const sortedItemNames = Array.from(allItemNames)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

    return sortedItemNames.map(itemName => {
        const key = itemName;
        const nameMatches = (n?: string) => (n || '').trim() === itemName;
        const relevantMasterRecords = inventoryMaster.filter(i => (i.itemName || '').trim() === itemName);
        
        let opening = 0;
        let masterStockTransfer = 0;
        let individualRate = 0;
        let groupHead = '';
        let uom = '';

        if (isPartyFiltered) {
            opening = 0;
            masterStockTransfer = 0;
            const meta = relevantMasterRecords[0];
            individualRate = Number(meta?.individualRate) || 0;
            groupHead = meta?.groupHead ||
                        projectIndents.find(i => nameMatches(i.productName))?.groupHead ||
                        projectIssues.find(is => nameMatches(is.productName))?.groupHead ||
                        transfers.find(t => nameMatches(t.productName))?.groupHead || '';
            uom = meta?.uom ||
                  projectIndents.find(i => nameMatches(i.productName))?.uom ||
                  projectStoreIns.find(s => nameMatches(s.productName))?.uom ||
                  projectIssues.find(is => nameMatches(is.productName))?.uom ||
                  transfers.find(t => nameMatches(t.productName))?.uom || '';
        } else if (isAllProjects) {
            opening = relevantMasterRecords.reduce((sum, r) => sum + (Number(r.opening) || 0), 0);
            masterStockTransfer = relevantMasterRecords.reduce((sum, r) => sum + (Number(r.stockTransfer) || 0), 0);
            
            // Metadata extraction with deep fallback
            const first = relevantMasterRecords[0];
            individualRate = Number(first?.individualRate) || 0;
            
            // Try Master -> Indents -> StoreIns -> Issues -> StockTransfers
            groupHead = first?.groupHead ||
                        projectIndents.find(i => nameMatches(i.productName))?.groupHead ||
                        projectIssues.find(is => nameMatches(is.productName))?.groupHead ||
                        transfers.find(t => nameMatches(t.productName))?.groupHead || '';

            uom = first?.uom ||
                  projectIndents.find(i => nameMatches(i.productName))?.uom ||
                  projectStoreIns.find(s => nameMatches(s.productName))?.uom ||
                  projectIssues.find(is => nameMatches(is.productName))?.uom ||
                  transfers.find(t => nameMatches(t.productName))?.uom || '';
        } else {
            const specific = relevantMasterRecords.find(r => 
                matchesProject(r.firmName || (r as any).firm_name || (r as any).firmNameMatch, (r as any).firm_id || (r as any).firmId)
            );
            opening = Number(specific?.opening) || 0;
            masterStockTransfer = Number(specific?.stockTransfer) || 0;
            
            const meta = specific || relevantMasterRecords[0];
            individualRate = Number(meta?.individualRate) || 0;
            
            // Try Master -> Indents -> StoreIns -> Issues -> StockTransfers
            groupHead = meta?.groupHead ||
                        projectIndents.find(i => nameMatches(i.productName))?.groupHead ||
                        projectIssues.find(is => nameMatches(is.productName))?.groupHead ||
                        transfers.find(t => nameMatches(t.productName))?.groupHead || '';

            uom = meta?.uom ||
                  projectIndents.find(i => nameMatches(i.productName))?.uom ||
                  projectStoreIns.find(s => nameMatches(s.productName))?.uom ||
                  projectIssues.find(is => nameMatches(is.productName))?.uom ||
                  transfers.find(t => nameMatches(t.productName))?.uom || '';
        }

        const projectNames = Array.from(new Set(relevantMasterRecords.map(r => r.firmName).filter(Boolean)));
        const resolvedFirmName = isAllProjects
            ? (projectNames.length > 0 ? projectNames.join(', ') : (projectIndents.find(i => nameMatches(i.productName))?.firmName || projectStoreIns.find(s => nameMatches(s.productName))?.firmNameMatch || '--'))
            : currentProject;

        const item = {
            itemName,
            groupHead,
            uom,
            opening,
            individualRate,
            stockTransfer: masterStockTransfer,
            firmName: resolvedFirmName,
            purchaseReturn: isPartyFiltered ? 0 : (isAllProjects 
                ? relevantMasterRecords.reduce((sum, r) => sum + (Number(r.purchaseReturn) || 0), 0)
                : (relevantMasterRecords.find(r => matchesProject(r.firmName || (r as any).firm_name, (r as any).firm_id))?.purchaseReturn || 0)),
            issueReturn: isPartyFiltered ? 0 : (isAllProjects
                ? relevantMasterRecords.reduce((sum, r) => sum + (Number(r.issueReturn) || 0), 0)
                : (relevantMasterRecords.find(r => matchesProject(r.firmName || (r as any).firm_name, (r as any).firm_id))?.issueReturn || 0)),
            outQuantity: isPartyFiltered ? 0 : (isAllProjects
                ? relevantMasterRecords.reduce((sum, r) => sum + (Number(r.outQuantity) || 0), 0)
                : (relevantMasterRecords.find(r => matchesProject(r.firmName || (r as any).firm_name, (r as any).firm_id))?.outQuantity || 0)),
            liftingQty: isPartyFiltered ? 0 : (isAllProjects
                ? relevantMasterRecords.reduce((sum, r) => sum + (Number(r.liftingQty) || 0), 0)
                : (relevantMasterRecords.find(r => matchesProject(r.firmName || (r as any).firm_name, (r as any).firm_id))?.liftingQty || 0)),
        };

        const iSum = indentSummary[key] || { quantity: 0, approvedQuantity: 0 };
        const sDet = storeInDetailed[key] || { liftingQty: 0, stockTransfer: 0, purchaseQuantity: 0, purchaseReturn: 0 };
        const oSum = issueSummary[key] || { givenQty: 0, rejected_damage_qty: 0 };

        // Core metrics: Use transaction sum if available, else fallback to master record baseline (unless party filtered)
        const indented = isPartyFiltered
            ? (iSum.quantity || 0)
            : (iSum.quantity || (isAllProjects ? relevantMasterRecords.reduce((sum, r) => sum + (Number(r.indented) || 0), 0) : (relevantMasterRecords.find(r => matchesProject(r.firmName, (r as any).firm_id))?.indented || 0)));
        const approved = isPartyFiltered
            ? (iSum.approvedQuantity || 0)
            : (iSum.approvedQuantity || (isAllProjects ? relevantMasterRecords.reduce((sum, r) => sum + (Number(r.approved) || 0), 0) : (relevantMasterRecords.find(r => matchesProject(r.firmName, (r as any).firm_id))?.approved || 0)));
        const purchaseQuantity = sDet.purchaseQuantity || 0;
        const liftingQty = isPartyFiltered ? (sDet.liftingQty || 0) : (sDet.liftingQty || item.liftingQty || 0);
        const purchaseReturn = isPartyFiltered ? (sDet.purchaseReturn || 0) : (sDet.purchaseReturn || item.purchaseReturn || 0);
        // If issue data was loaded from DB, trust the live aggregated sum (even if 0).
        // Only fall back to the master record's stale out_quantity if no issue data was fetched at all.
        // This prevents ghost quantities appearing for items whose issue records were deleted.
        const issueDataLoaded = issues.length > 0;
        const outQuantity = isPartyFiltered
            ? (oSum.givenQty || 0)
            : (issueDataLoaded ? (oSum.givenQty || 0) : (oSum.givenQty || item.outQuantity || 0));
        const issueReturnQty = oSum.rejected_damage_qty ?? (oSum as any).rejectedDamageQty ?? 0;
        const issueReturn = isPartyFiltered
            ? (issueReturnQty || 0)
            : (issueDataLoaded ? (issueReturnQty || 0) : (issueReturnQty || item.issueReturn || 0));

        // Stock Transfer: Old way (from storeIn) + New way (from dedicated table)
        const tSum = transferSummary[key] || { in: 0, out: 0, totalVolume: 0, sources: new Set(), destinations: new Set() };
        let stockTransfer = isPartyFiltered
            ? (sDet.stockTransfer || 0)
            : ((sDet.stockTransfer || 0) + (item.stockTransfer || 0));
        
        const stockTransferReceiving = isPartyFiltered
            ? ((sDet.stockTransfer || 0) + (isAllProjects ? tSum.totalVolume : tSum.in))
            : ((sDet.stockTransfer || 0) + (item.stockTransfer || 0) + (isAllProjects ? tSum.totalVolume : tSum.in));
        const stockTransferGiven = isAllProjects ? tSum.totalVolume : tSum.out;

        const sourcesArr = Array.from(tSum.sources);
        const destinationsArr = Array.from(tSum.destinations);
        const fromProject = sourcesArr.length > 0 ? (sourcesArr.length > 1 ? `${sourcesArr[0]} (+${sourcesArr.length - 1})` : sourcesArr[0]) : '';
        const toProject = destinationsArr.length > 0 ? (destinationsArr.length > 1 ? `${destinationsArr[0]} (+${destinationsArr.length - 1})` : destinationsArr[0]) : '';

        if (isAllProjects && !isPartyFiltered) {
            stockTransfer += tSum.totalVolume;
        } else if (!isPartyFiltered) {
            stockTransfer += (tSum.in - tSum.out);
        }

        // Derived metrics
        const inTransit = Math.max(0, purchaseQuantity - liftingQty);
        
        // Final Current Quantity Calculation:
        // Current = Opening + Lifting + NetStockTransfer - PurchaseReturn - (Issued - IssueReturn)
        const netTransferForBalance = isAllProjects ? 0 : (tSum.in - tSum.out);
        const current = (item.opening || 0) + liftingQty + (sDet.stockTransfer || 0) + netTransferForBalance + (item.stockTransfer || 0) - purchaseReturn - (outQuantity - issueReturn);

        // Filter: If party filtered, ensure the item has actual activity for this party
        if (isPartyFiltered) {
            const hasPartyActivity = (
                indented !== 0 ||
                approved !== 0 ||
                liftingQty !== 0 ||
                inTransit !== 0 ||
                outQuantity !== 0 ||
                purchaseReturn !== 0 ||
                issueReturn !== 0 ||
                stockTransferReceiving !== 0 ||
                stockTransferGiven !== 0
            );
            if (!hasPartyActivity) {
                return null as any;
            }
        } else if (!isAllProjects) {
            // Filter: If filtering by a specific project, ensure the item has actual presence/activity in this project
            const hasProjectMaster = projectMaster.some(r => (r.itemName || '').trim() === itemName);
            const hasActivity = (
                (item.opening || 0) !== 0 ||
                current !== 0 ||
                indented !== 0 ||
                approved !== 0 ||
                liftingQty !== 0 ||
                outQuantity !== 0 ||
                inTransit !== 0 ||
                purchaseReturn !== 0 ||
                issueReturn !== 0 ||
                stockTransferReceiving !== 0 ||
                stockTransferGiven !== 0
            );
            if (!hasProjectMaster && !hasActivity) {
                return null as any;
            }
        }

        // Calculate dynamic Avg Price:
        // Priority 1: Total Price of Lifting / Total Quantity of Lifting (Weighted average of lifted stock)
        const isLifted = (s: any) => {
            const raw = s.materialDate ?? s.material_date;
            if (!raw) return false;
            const str = String(raw).trim().toLowerCase();
            return str !== '' && str !== 'null' && str !== 'undefined' && str !== '-' && str !== 'n/a';
        };

        const matchingLiftingIns = projectStoreIns.filter(s =>
            nameMatches(s.productName || (s as any).product) &&
            Number(s.receivedQuantity || 0) > 0 &&
            isLifted(s) &&
            s.receivingStatus !== 'Transfer'
        );

        let totalLiftingValue = 0;
        let totalLiftingQty = 0;

        matchingLiftingIns.forEach(s => {
            const q = Number(s.receivedQuantity || 0);

            // Find linked indent specifically for this product and indent/PO
            const matchedIndent: any = projectIndents?.find((ind: any) => {
                const prodMatch = nameMatches(ind.productName || ind.product);
                const indentMatch = Boolean(s.indentNo && ind.indentNumber && String(ind.indentNumber).trim() === String(s.indentNo).trim());
                const poMatchNum = Boolean(s.poNumber && ind.poNumber && String(ind.poNumber).trim() === String(s.poNumber).trim());
                return prodMatch && (indentMatch || poMatchNum);
            });

            // Find linked PO created for this indent/lift data and product
            const targetPoNumber = s.poNumber || (s as any).po_number || matchedIndent?.poNumber || matchedIndent?.po_number;
            const poMatch = poMaster?.find((p: any) => {
                const poNumMatch = Boolean(targetPoNumber && p.poNumber && String(p.poNumber).trim() === String(targetPoNumber).trim());
                const prodMatch = nameMatches(p.product || p.productName);
                return poNumMatch && prodMatch;
            });

            // Rate Priority strictly matching the Lifting Quantity History modal (Inventory.tsx):
            // 1. PO Rate for this lift / indent
            // 2. Approved Rate from indent
            // 3. priceAsPerPo / rate from store_in
            // 4. Base indent rate
            const r = Number(
                poMatch?.rate ||
                matchedIndent?.approvedRate ||
                matchedIndent?.approved_rate ||
                (s as any).priceAsPerPo ||
                (s as any).rate ||
                matchedIndent?.rate ||
                matchedIndent?.rate1 ||
                0
            );

            if (r > 0 && q > 0) {
                totalLiftingValue += Number((r * q).toFixed(2));
                totalLiftingQty += q;
            }
        });

        let resolvedAvgPrice = 0;
        if (totalLiftingQty > 0 && totalLiftingValue > 0) {
            resolvedAvgPrice = Number((totalLiftingValue / totalLiftingQty).toFixed(2));
        } else {
            // Priority 2 Fallback: Master individualRate / avgPrice (when no lifting occurred yet)
            resolvedAvgPrice = Number(
                (relevantMasterRecords[0] as any)?.avgPrice ??
                (relevantMasterRecords[0] as any)?.avg_price ??
                (relevantMasterRecords[0] as any)?.individualRate ??
                item.individualRate ??
                0
            );

            // Priority 3 Fallback: Latest Approved / Indent rate
            if (!resolvedAvgPrice) {
                const matchingIndents = projectIndents.filter(i => nameMatches(i.productName || (i as any).product));
                const indentWithRate = matchingIndents.find(i => Number((i as any).approvedRate || (i as any).approved_rate || (i as any).rate || (i as any).rate1 || 0) > 0);
                if (indentWithRate) {
                    resolvedAvgPrice = Number((indentWithRate as any).approvedRate || (indentWithRate as any).approved_rate || (indentWithRate as any).rate || (indentWithRate as any).rate1 || 0);
                }
            }
        }

        const totalPrice = Number((current * (resolvedAvgPrice || 0)).toFixed(2));

        return {
            ...item,
            indented,
            approved,
            purchaseQuantity,
            purchaseReturn,
            liftingQty,
            inTransit,
            outQuantity,
            issueReturn,
            stockTransfer,
            stockTransferGiven,
            stockTransferReceiving,
            fromProject,
            toProject,
            current,
            avgPrice: resolvedAvgPrice,
            totalPrice,
            colorCode: current === 0 ? 'reject' : (current < 5 ? 'red' : 'green'),
            status: current === 0 ? 'Out of Stock' : (current < 5 ? 'red' : 'green')
        } as InventorySheet;
    }).filter(Boolean);
}

/**
 * Helper to group an array of objects by a key and sum specified numeric fields
 */
function groupAndSum<T>(data: T[], keyField: keyof T, sumFields: string[]): Record<string, any> {
    return data.reduce((acc, item) => {
        const key = String(item[keyField] || '').trim();
        if (!key) return acc;
        if (!acc[key]) {
            acc[key] = {};
            sumFields.forEach(f => acc[key][f] = 0);
        }
        sumFields.forEach(f => {
            const val = Number((item as any)[f]) || 0;
            acc[key][f] += val;
        });
        return acc;
    }, {} as Record<string, any>);
}

