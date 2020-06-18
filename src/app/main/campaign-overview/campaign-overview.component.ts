import { Component, OnInit, Input } from '@angular/core';
import { CampaignDetail, CampaignData, CommissionType } from 'src/types/campaign';

import * as moment from 'moment';
import { UtilsService } from 'src/app/services/util.service';

@Component({
    selector: 'app-campaign-overview',
    templateUrl: './campaign-overview.component.html',
    styleUrls: ['./campaign-overview.component.scss'],
})
export class CampaignOverviewComponent implements OnInit {
    @Input() campaign: CampaignDetail;

    constructor(
        private utilService: UtilsService,
    ) { }

    ngOnInit(): void {
    }


    displayTime(end_time) {
        const endTime = moment(end_time).format('MMMM Do YYYY HH:mm');
        return endTime;
    }


    displayCommission(campaign: CampaignDetail) {
        return this.utilService.displayCommission(campaign);
    }

}
