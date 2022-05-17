export interface KillBillAccount {
    accountId: string;
    name: string;
    firstNameLength: number;
    externalKey: string;
    email: string;
    billCycleDayLocal: number;
    currency: string;
    parentAccountId: string;
    isPaymentDelegatedToParent: boolean;
    paymentMethodId: string;
    referenceTime: string;
    timeZone: string;
    address1: string;
    address2: string;
    postalCode: string;
    company: string;
    city: string;
    state: string;
    country: string;
    locale: string;
    phone: string;
    notes: string;
    isMigrated: boolean;
    accountBalance?: number;
    accountCBA?: number;
    auditLogs?: [];
}
