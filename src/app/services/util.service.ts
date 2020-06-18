import { CampaignDetail, CommissionType } from "src/types/campaign";
import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root',
})
export class UtilsService {
    displayCommission(campaign: CampaignDetail) {
        const extra_info = campaign.extra_info;
        // Handle legacy code
        const commission_dollar = campaign.commission_dollar !== undefined ? campaign.commission_dollar : campaign['commision_dollar'];
        const commission_percent = campaign.commission_percent !== undefined ? campaign.commission_percent : campaign['commission_percentage'];
        if (extra_info && extra_info['commissionType']) {
            const type: CommissionType = extra_info['commissionType'];
            if (type === CommissionType.ONE_TIME_PAY) {
                return `$ ${commission_dollar}`;
            } else if (type === CommissionType.PER_SALES) {
                return `${commission_percent} %`;
            } else if (type === CommissionType.FIX_PAY_PLUS_PER_SALES) {
                return `$ ${commission_dollar} + ${commission_percent} %`;
            }
        }
        return `$ ${commission_dollar}`
    }

}