import {
    Catalog,
    CatalogCurrenciesEnum,
    Duration,
    DurationUnitEnum,
    Phase,
    Plan,
    PlanBillingPeriodEnum,
    PriceCurrencyEnum,
} from 'killbill';
import { AccountMember } from '../models/account-member';

export function extractCatalogObject(accountId: string, asfObject: AccountMember): Catalog {
    return {
        name: `CATALOG-${accountId}`,
        effectiveDate: new Date().toISOString(),
        currencies: [CatalogCurrenciesEnum.USD],
        products: [
            {
                type: 'BASE',
                name: `DUES-${asfObject.offerFees.clientOfferId}`,
                prettyName: `DUES-${asfObject.offerFees.clientOfferId}`,
                plans: [
                    {
                        name: `PLAN-${asfObject.offerFees.offerPaymentTermId}-${asfObject.offerFees.offerContractDates.startDate}`,
                        prettyName: `PLAN-${asfObject.offerFees.offerPaymentTermId}-${asfObject.offerFees.offerContractDates.startDate}`,
                        billingPeriod: extractKBPlanBillingPeriod(
                            asfObject.offerFees.recurringFees.paymentFrequency.paymentFrequencyId,
                        ),
                        phases: createPhases(asfObject),
                    },
                ],
            },
        ],
        priceLists: [
            {
                name: 'DEFAULT',
                plans: [
                    `PLAN-${asfObject.offerFees.offerPaymentTermId}-${asfObject.offerFees.offerContractDates.startDate}`,
                ],
            },
        ],
    };
}

export function setPresetRenewalPlan(catalogObject: Catalog, asfObject: AccountMember) {
    const renewalPlan: Plan = {
        name: `PLAN-${asfObject.offerFees.offerPaymentTermId}-${asfObject.offerFees.offerContractDates.renewalDate}`,
        prettyName: `PLAN-${asfObject.offerFees.offerPaymentTermId}-${asfObject.offerFees.offerContractDates.renewalDate}`,
        billingPeriod: extractKBPlanBillingPeriod(
            asfObject.offerFees.recurringFees.paymentFrequency.paymentFrequencyId,
        ),
        phases: createRenewalPhase(asfObject),
    };

    if (catalogObject == undefined || catalogObject.products == undefined) {
        return false;
    }
    catalogObject.products[0].plans?.push(renewalPlan);

    if (catalogObject.priceLists != undefined && renewalPlan.name != undefined) {
        catalogObject.priceLists[0].plans?.push(renewalPlan.name);
    }
}

/**
 * Extract Billing Period from paymentFrequencyId
 * @param paymentFrequencyId
 */
function extractKBPlanBillingPeriod(paymentFrequencyId: number) {
    switch (paymentFrequencyId) {
        case 1:
            return PlanBillingPeriodEnum.WEEKLY;
        case 2:
            return PlanBillingPeriodEnum.BIWEEKLY;
        case 3:
            return PlanBillingPeriodEnum.MONTHLY;
        case 4:
            return PlanBillingPeriodEnum.BIMESTRIAL;
        case 5:
            return PlanBillingPeriodEnum.QUARTERLY;
        case 6:
            return PlanBillingPeriodEnum.BIANNUAL;
        case 7:
            return PlanBillingPeriodEnum.ANNUAL;
        case 8:
            return PlanBillingPeriodEnum.NOBILLINGPERIOD;
    }
}

/**
 * Create Phases for KB Plans
 * @param asfObject
 */
function createPhases(asfObject: AccountMember): Phase[] {
    // Check if plan is open-ended
    if (asfObject.offerFees.offerContractDates.openEnded == true) {
        return [
            {
                type: 'EVERGREEN',
                prices: [
                    {
                        currency: PriceCurrencyEnum.USD,
                        value: asfObject.offerFees.recurringFees.perPaymentTotal,
                    },
                ],
                fixedPrices: [],
                duration: {
                    unit: DurationUnitEnum.UNLIMITED,
                    number: -1,
                },
                usages: [],
            },
        ];
    } else {
        if (asfObject.offerFees.recurringFees.paymentFrequency.paymentFrequencyId == 8) {
            return [
                {
                    type: 'FIXEDTERM',
                    prices: [],
                    fixedPrices: [
                        {
                            currency: PriceCurrencyEnum.USD,
                            value: asfObject.offerFees.recurringFees.perPaymentTotal,
                        },
                    ],
                    duration: createDuration(asfObject),
                    usages: [],
                },
            ];
        } else {
            return [
                {
                    type: 'FIXEDTERM',
                    prices: [
                        {
                            currency: PriceCurrencyEnum.USD,
                            value: asfObject.offerFees.recurringFees.perPaymentTotal,
                        },
                    ],
                    fixedPrices: [],
                    duration: createDuration(asfObject),
                    usages: [],
                },
            ];
        }
    }
}

function createRenewalPhase(asfObject: AccountMember): Phase[] {
    // Evergreen / renew to open end
    if (asfObject.offerFees.offerPresetRenewalTerm.numberOfPayments == 0) {
        return [
            {
                type: 'EVERGREEN',
                prices: [
                    {
                        currency: PriceCurrencyEnum.USD,
                        value: asfObject.offerPresetRenewalPaymentTerm.paymentAmount,
                    },
                ],
                fixedPrices: [],
                duration: {
                    unit: DurationUnitEnum.UNLIMITED,
                    number: -1,
                },
                usages: [],
            },
        ];
    } else {
        return [
            {
                type: 'FIXEDTERM',
                prices: [
                    {
                        currency: PriceCurrencyEnum.USD,
                        value: asfObject.offerPresetRenewalPaymentTerm.paymentAmount,
                    },
                ],
                fixedPrices: [],
                duration: createDuration(asfObject, true),
                usages: [],
            },
        ];
    }
}

/**
 * Create Duration for KB Phase
 * * @param asfObject
 */
function createDuration(asfObject: AccountMember, isRenewalPlan = false): Duration {
    const paymentFrequencyId = asfObject.offerFees.recurringFees.paymentFrequency.paymentFrequencyId;
    // Paid in Full (only for the preset renewal plans
    if (isRenewalPlan) {
        return {
            unit: DurationUnitEnum.MONTHS,
            number: asfObject.offerPresetRenewalPaymentTerm.renewalLength,
        };
    } else if (paymentFrequencyId == 8) {
        // Paid in Full
        const renewalDate = asfObject.offerFees.offerContractDates.renewalDate;
        const firstPaymentDueDate = asfObject.offerFees.offerContractDates.firstPaymentDueDate;
        let daysDiff = new Date(renewalDate).getTime() - new Date(firstPaymentDueDate).getTime();
        daysDiff = Math.ceil(daysDiff / (1000 * 3600 * 24));
        return {
            unit: DurationUnitEnum.DAYS,
            number: daysDiff,
        };
    } else {
        // Term Plan
        const totalPayments = asfObject.offerFees.totalPayments;
        let unit;
        let number;
        switch (paymentFrequencyId) {
            // Weekly
            case 1:
                unit = DurationUnitEnum.DAYS;
                number = totalPayments * 7;
                break;
            // Bi-weekly
            case 2:
                unit = DurationUnitEnum.DAYS;
                number = totalPayments * 14;
                break;
            // Monthly
            case 3:
                unit = DurationUnitEnum.MONTHS;
                number = totalPayments;
                break;
            // Bi-Monthly
            case 4:
                unit = DurationUnitEnum.MONTHS;
                number = totalPayments * 2;
                break;
            // Quarterly
            case 5:
                unit = DurationUnitEnum.MONTHS;
                number = totalPayments * 3;
                break;
            // Bi-annual
            case 6:
                unit = DurationUnitEnum.MONTHS;
                number = totalPayments * 6;
                break;
            // Annual
            case 7:
                unit = DurationUnitEnum.YEARS;
                number = totalPayments;
                break;
        }
        return {
            unit,
            number,
        };
    }
}
