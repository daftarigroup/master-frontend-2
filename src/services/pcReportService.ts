import { apiClient } from '@/lib/apiClient';
import type { PcReportSheet } from '@/types/sheets';

/**
 * PC Report Service
 * Handles all REST API operations for the PC Report component via master-backend
 */

/**
 * Fetch all PC report records from master-backend (/api/store/entity/pc_report)
 */
export async function fetchPcReportRecords(): Promise<PcReportSheet[]> {
    try {
        const res: any = await apiClient.get('/store/entity/pc_report', {
            params: { order: 'created_at.desc', limit: 'all' },
        });
        const data = res.data || [];

        // Deduplicate by stage – keep only the most recent record for each stage
        const uniqueStages = new Map<string, PcReportSheet>();
        
        data.forEach((r: any) => {
            if (r.stage && !uniqueStages.has(r.stage)) {
                uniqueStages.set(r.stage, {
                    stage: r.stage || '',
                    totalPending: Number(r.total_pending) || 0,
                    totalComplete: Number(r.total_complete) || 0,
                    pendingPmpl: Number(r.pending_pmpl) || 0,
                    pendingPurab: Number(r.pending_purab) || 0,
                    pendingPmmpl: Number(r.pending_pmmpl) || 0,
                    pendingRefrasynth: Number(r.pending_refrasynth) || 0,
                });
            }
        });

        return Array.from(uniqueStages.values());
    } catch (error) {
        console.error('Error fetching PC report records:', error);
        throw error;
    }
}