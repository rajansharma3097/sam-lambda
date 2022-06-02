/* eslint-disable @typescript-eslint/no-explicit-any */
export interface AccountMember {
    accountId: number;
    accountNumber: string;
    prospectNumber: null;
    membershipType: number;
    membershipStatus: any;
    cashDrawerId: number;
    salesPersonId: number;
    terminalId: string;
    signatureImage: string;
    signatureImageType: any;
    members: Array<any>;
    offerFees: any;
    offerPresetRenewalPaymentTerm: any;
    genericTerms: any;
    note: any;
    emergencyContacts: [];
    enteredBy: string;
}

export enum AccountMemberGender {
    'Female' = 1,
    'Male',
}
