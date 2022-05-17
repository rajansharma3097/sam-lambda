export interface AccountMember {
    accountMemberId: number;
    accountId: number;
    accountNumber: string;
    accountSequence: string;
    firstName: string;
    middleName: string;
    lastName: string;
    gender: AccountMemberGender;
    birthday: string;
    address1: string;
    address2: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    authority: boolean;
    active: boolean;
    alternateAccount: string;
    lastModified: string;
    lastModifiedBy: string;
}

export enum AccountMemberGender {
    'Female' = 1,
    'Male',
}
