import { Component, OnInit, Input } from '@angular/core';
import { Campaign } from 'src/types/campaign';

import * as moment from 'moment';

@Component({
    selector: 'app-campaign-card',
    templateUrl: './campaign-card.component.html',
    styleUrls: ['./campaign-card.component.scss'],
})
export class CampaignCardComponent implements OnInit {

    @Input() campaign: Campaign;

    constructor() { }

    ngOnInit(): void {
    }

    displayTime(end_time) {
        const endTime = moment(end_time).format('MMMM Do YYYY HH:mm');
        const daysLeft = moment(end_time).diff(moment(), 'days');
        return `${endTime} (${daysLeft} days left)`;
    }

}
