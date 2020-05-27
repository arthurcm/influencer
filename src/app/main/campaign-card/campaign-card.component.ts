import { Component, OnInit, Input } from '@angular/core';
import { Campaign } from 'src/types/campaign';

import * as moment from 'moment';
import { Router } from '@angular/router';

@Component({
    selector: 'app-campaign-card',
    templateUrl: './campaign-card.component.html',
    styleUrls: ['./campaign-card.component.scss'],
})
export class CampaignCardComponent implements OnInit {

    @Input() campaign: Campaign;

    constructor(
        public router: Router,
    ) { }

    ngOnInit(): void {
    }

    displayTime(end_time) {
        const endTime = moment(end_time).format('MMMM Do YYYY HH:mm');
        return `${endTime}`;
    }

    daysLeft(end_time) {
        const daysLeft = moment(end_time).diff(moment(), 'days');
        return `${daysLeft}`;
    }

    viewCampaign() {
        this.router.navigate([`/app/campaign/${this.campaign.campaign_data.campaign_id}`]);
    }

    deleteCampaign() {
    }

}
