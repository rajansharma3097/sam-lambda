import * as kb from 'killbill';
import axios, { AxiosInstance } from 'axios';
import { KBSecrets } from '../models/kb-secrets';

export default class KillBillClient {
    config: kb.Configuration;
    axiosInstance: AxiosInstance;
    kbCreds: KBSecrets;
    constructor(killBillCredentials: KBSecrets) {
        this.kbCreds = killBillCredentials;
        this.config = new kb.Configuration({
            username: killBillCredentials.User,
            password: killBillCredentials.Password,
            apiKey: kb.apiKey(killBillCredentials.ApiKey, killBillCredentials.ApiSecret),
            basePath: killBillCredentials.Url,
        });
        this.axiosInstance = axios.create();
    }

    /**
     * get account by external key
     * @param externalKey
     */
    async getAccountByKey(externalKey: string) {
        const response = await new kb.AccountApi(this.config).getAccountByKey(externalKey);
        return response;
    }

    /**
     * Get subscription by external key
     * @param externalKey
     */
    async getSubscriptionByKey(externalKey: string) {
        const response = await new kb.SubscriptionApi(this.config).getSubscriptionByKey(externalKey);
        return response;
    }

    /**
     * Create Account in KillBill
     * @param account
     */
    async createAccount(account: kb.Account) {
        const response = await new kb.AccountApi(this.config).createAccount(account, this.kbCreds.ApiKey);
        return response;
    }

    /**
     * Create Subscription in KB
     * @param subscription
     */
    async createSubscription(subscription: any) {
        const response = await new kb.SubscriptionApi(this.config).createSubscription(
            subscription,
            this.kbCreds.ApiKey,
        );
        return response;
    }

    /**
     * Update Subscription Plan by Subscription ID
     * @param subscription
     * @param subsId
     */
    async updateSubscription(subscription: kb.Subscription, subsId: string) {
        const response = await new kb.SubscriptionApi(this.config).changeSubscriptionPlan(
            subscription,
            subsId,
            this.kbCreds.ApiKey,
        );
        return response;
    }
}
