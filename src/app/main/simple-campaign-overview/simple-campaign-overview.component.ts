import { Component, OnInit, Input } from '@angular/core';
import { CampaignDetail } from 'src/types/campaign';

import * as moment from 'moment';

@Component({
    selector: 'app-simple-campaign-overview',
    templateUrl: './simple-campaign-overview.component.html',
    styleUrls: ['./simple-campaign-overview.component.scss'],
})
export class SimpleCampaignOverviewComponent implements OnInit {
    @Input() campaign: CampaignDetail;

    constructor() { }

    ngOnInit(): void {
    }

    displayTime(end_time) {
        const endTime = moment(end_time).format('MMMM Do YYYY HH:mm');
        return endTime;
    }
}
