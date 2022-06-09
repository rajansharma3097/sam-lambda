/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Contact {
    accountMemberContactId: number;
    accountMemberId: number;
    contactTypeId: number;
    contactValue: string;
}

export interface Preferences {
    accountMemberPreferenceId: number;
    accountMemberId: number;
    textOptIn: boolean;
    textOptInChanged: string;
    textOptInChangedBy: string;
    emailOptIn: boolean;
    emailOptInChanged: string;
    emailOptInChangedBy: string;
}

export interface Member {
    contacts: Contact[];
    attributes: any[];
    preferences: Preferences;
    beltRankId: number;
    accountMemberId: number;
    accountId: number;
    accountNumber: string;
    accountSequence: string;
    namePrefix: string;
    firstName: string;
    middleName: string;
    lastName: string;
    nameSuffix: string;
    gender: number;
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
    lastModifiedBy?: any;
}

export interface SignupFees {
    offerItemDetails: any[];
    signupDues: number;
    signupDuesAdjusted: number;
    signupDuesAdminFee: number;
    signupDuesCreditCardFee: number;
    cardholderTotalSignupDues: number;
    cardholderTotalSignupDuesAdjusted: number;
    cardholderTotalSignupDuesAdminFee: number;
    cardholderTotalSignupDuesCreditCardFee: number;
    subtotal: number;
    taxTotal: number;
    discountTotal: number;
    adminFee: number;
    creditCardFee: number;
    finalTotal: number;
    paidWithCreditCard: boolean;
}

export interface PaymentFrequency {
    paymentFrequencyId: number;
    description: string;
    legacyMapping: string;
    legacyAddonFrequency: number;
    lastModified: string;
    lastModifiedBy: string;
}

export interface RecurringFees {
    paymentFrequency: PaymentFrequency;
    remainingPayments: number;
    paymentDues: number;
    paymentDuesAdjusted: number;
    paymentDuesAdminFee: number;
    paymentDuesCreditCardFee: number;
    cardholderTotalDues: number;
    cardholderTotalDuesAdjusted: number;
    cardholderTotalDuesAdminFee: number;
    cardholderTotalDuesCreditCardFee: number;
    discountTotal: number;
    adminFee: number;
    creditCardFee: number;
    perPaymentTotal: number;
    finalContractTotal: number;
    paidWithCreditCard: boolean;
}

export interface ExceptionBase {
    exceptionId: number;
    name: string;
    displayName: string;
    exceptionType: number;
    dataType: string;
}

export interface OfferExceptionDetail {
    exceptionBase: ExceptionBase;
    offerExceptionId: number;
    exceptionId: number;
    clientOfferId: number;
    exceptionValue: string;
    lastModified: string;
    lastModifiedBy: string;
}

export interface OfferContractDates {
    signingDate: string;
    defaultStartDate: string;
    startDate: string;
    lastStartDate: string;
    endDate: string;
    defaultFirstPaymentDueDate: string;
    firstPaymentDueDate: string;
    renewalDate: string;
    prorated: boolean;
    proratedFirstFullPaymentDay?: any;
    openEnded: boolean;
    offerLengthType: number;
    offerLength: number;
    paymentOffsetException: number;
}

export interface OfferPresetRenewalTerm {
    offerPresetRenewalPaymentTermId: number;
    paymentTermId: number;
    renewalLength: number;
    paymentAmount: number;
    numberOfPayments: number;
    firstDueOffset: number;
    additionalCardholderFee: number;
    renewalTerm: string;
    lastModified: string;
    lastModifiedBy: string;
}

export interface PresetRenewalFees {
    renewalLength: number;
    numberOfPayments: number;
    paymentAmount: number;
    additionalCardholderFeeTotal: number;
    perPaymentTotal: number;
    finalContractTotal: number;
}

export interface OfferFees {
    clientOfferId: number;
    clientId: number;
    offerPaymentTermId: number;
    discountCode: string;
    adjustments: any[];
    adjustmentsApplied: boolean;
    signatureRequired: boolean;
    maxAdditionalCardholders: number;
    additionalCardholderCount: number;
    additionalCardholderFeeAmount: number;
    adminFeePercentage: number;
    creditCardFeePercentage: number;
    paymentAmount: number;
    totalPayments: number;
    initialTotalPayments: number;
    signupFees: SignupFees;
    recurringFees: RecurringFees;
    addonFees: any[];
    offerMemberAttributes?: any;
    offerExceptionDetails: OfferExceptionDetail[];
    sessionBuckets?: any;
    offerContractDates: OfferContractDates;
    today: string;
    offerPresetRenewalTerm: OfferPresetRenewalTerm;
    presetRenewalFees: PresetRenewalFees;
    hasDiscountCodes: boolean;
    textOptInSet: boolean;
}

export interface CardholderAddress {
    address1: string;
    address2?: any;
    city: string;
    state: number;
    postalCode: string;
    country: number;
}

export interface SignupCreditCardAccount {
    cardNumber: number;
    cardNumberMask?: any;
    cardNumberEncrypted?: any;
    cardCVV: number;
    expirationMonth: number;
    expirationYear: number;
    cardholderName?: any;
    cardholderAddress: CardholderAddress;
}

export interface CardholderAddress2 {
    address1: string;
    address2?: any;
    city: string;
    state: number;
    postalCode: string;
    country: number;
}

export interface RecurringCreditCardAccount {
    cardNumber: number;
    cardNumberMask?: any;
    cardNumberEncrypted?: any;
    cardCVV: number;
    expirationMonth: number;
    expirationYear: number;
    cardholderName?: any;
    cardholderAddress: CardholderAddress2;
}

export interface AccountholderAddress {
    address1?: any;
    address2?: any;
    city?: any;
    state: number;
    postalCode?: any;
    country: number;
}

export interface RecurringEFTAccount {
    bankName?: any;
    routingNumber?: any;
    accountNumber?: any;
    accountholderName?: any;
    accountholderAddress: AccountholderAddress;
    bankAccountType: number;
}

export interface Payment {
    signupPaymentType: number;
    signupCreditCardAccount: SignupCreditCardAccount;
    recurringPaymentType: number;
    recurringCreditCardAccount: RecurringCreditCardAccount;
    recurringEFTAccount: RecurringEFTAccount;
}

export interface OfferPresetRenewalPaymentTerm {
    offerPresetRenewalPaymentTermId: number;
    paymentTermId: number;
    renewalLength: number;
    paymentAmount: number;
    numberOfPayments: number;
    firstDueOffset: number;
    additionalCardholderFee: number;
    renewalTerm: string;
    lastModified: string;
    lastModifiedBy: string;
}

export interface GenericTerms {
    genericOfferTermId: number;
    genericPaymentTermId: number;
}

export interface EmergencyContact {
    accountNumber?: any;
    firstName?: any;
    lastName?: any;
    relationship?: any;
    primaryPhone: number;
    secondaryPhone: number;
}
