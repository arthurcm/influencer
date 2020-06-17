import { Component, OnInit, Input } from '@angular/core';
import { CampaignDetail, CampaignData, CommissionType } from 'src/types/campaign';

import * as moment from 'moment';

@Component({
    selector: 'app-campaign-overview',
    templateUrl: './campaign-overview.component.html',
    styleUrls: ['./campaign-overview.component.scss'],
})
export class CampaignOverviewComponent implements OnInit {
    @Input() campaign: CampaignDetail;

    constructor() { }

    ngOnInit(): void {
    }


    displayTime(end_time) {
        const endTime = moment(end_time).format('MMMM Do YYYY HH:mm');
        return endTime;
    }


    displayCommission(campaign: CampaignDetail) {
        const extra_info = campaign.extra_info;
        if (extra_info && extra_info['commissionType']) {
            const type: CommissionType = extra_info['commissionType'];
            if (type === CommissionType.ONE_TIME_PAY) {
                return `$ ${campaign.commision_dollar}`;
            } else if (type === CommissionType.PER_SALES) {
                return `${campaign.commission_percent} %`;
            } else {
                return `$ ${campaign.commision_dollar} + ${campaign.commission_percent} %`;
            }
        }
        return `$ ${campaign.commision_dollar}`
    }

}
