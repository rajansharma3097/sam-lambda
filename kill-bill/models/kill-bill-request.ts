export interface KillBillRequest {
    isMigrated: boolean;
    currency: string;
    name: string;
    email?: string;
    externalKey: string;
}
