import type { JSX } from "react";
import type { IndentSheet, StoreInSheet, UserPermissions } from "@/types/sheets";
export type IssueSheet = any;
export type FullKittingSheet = any;
export type PCReportSheet = any;
export type POMasterSheet = any;
export type TallyEntrySheet = any;
export type ReceivedSheet = any;
export type PaymentHistorySheet = any;

export type AllSheets = 
    | IndentSheet[]
    | StoreInSheet[]
    | IssueSheet[]
    | FullKittingSheet[]
    | PCReportSheet[]
    | POMasterSheet[]
    | TallyEntrySheet[]
    | ReceivedSheet[]
    | PaymentHistorySheet[];

export interface RouteAttributes {
    name: string;
    element: JSX.Element;
    path: string;
    icon: JSX.Element;
    gateKey?: keyof UserPermissions;
    notifications: (sheet: AllSheets, user?: any) => number;
    hidden?: boolean;
}
