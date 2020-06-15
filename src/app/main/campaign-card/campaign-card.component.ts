import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Campaign, CampaignDetail } from 'src/types/campaign';

import * as moment from 'moment';
import { Router } from '@angular/router';

@Component({
    selector: 'app-campaign-card',
    templateUrl: './campaign-card.component.html',
    styleUrls: ['./campaign-card.component.scss'],
})
export class CampaignCardComponent implements OnInit {

    @Input() campaign: CampaignDetail;
    @Input() promotionCampaign: boolean;
    @Input() brandCampaign: boolean;
    @Output() onDeleteCampaign = new EventEmitter<CampaignDetail>();
    @Output() onSignupCampaign = new EventEmitter<CampaignDetail>();

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
        return Math.max(0, daysLeft);
    }

    viewCampaign() {
        this.router.navigate([`/app/campaign/${this.campaign.campaign_id}`]);
    }

    viewBrandCampaign() {
        this.router.navigate([`/app/brand-campaign/${this.campaign.brand_campaign_id}`]);
    }

    deleteCampaign() {
        this.onDeleteCampaign.emit(this.campaign);
    }

    signupCampaign() {
        this.onSignupCampaign.emit(this.campaign);
    }

}
