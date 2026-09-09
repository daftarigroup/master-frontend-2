// HR Gate Pass Types

export interface GatePass {
  id: number;
  tenantId: string;
  employeeId: string;
  placeToVisit: string;
  reason: string;
  departureTime: string;
  expectedArrival: string;
  whatsappNo?: string | null;
  attachment?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  // Present only under "All Companies" (merged) view.
  tenant?: { id: string; name: string } | null;
}

export interface GatePassStats {
  total: number;
  issued: number;
  returned: number;
  pending: number;
  [key: string]: number;
}
