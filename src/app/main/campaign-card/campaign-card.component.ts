import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Campaign, CampaignDetail } from 'src/types/campaign';

import * as moment from 'moment';
import { Router } from '@angular/router';

import { UtilsService } from 'src/app/services/util.service'
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from 'src/app/shared/confirm-dialog/confirm-dialog.component';

@Component({
    selector: 'app-campaign-card',
    templateUrl: './campaign-card.component.html',
    styleUrls: ['./campaign-card.component.scss'],
})
export class CampaignCardComponent implements OnInit {

    @Input() campaign: CampaignDetail;
    @Input() promotionCampaign: boolean;
    @Input() brandCampaign: boolean;
    @Input() isBrandView: boolean;
    @Input() campaignRevenue: any;
    @Output() onDeleteCampaign = new EventEmitter<CampaignDetail>();
    @Output() onSignupCampaign = new EventEmitter<CampaignDetail>();

    constructor(
        public router: Router,
        public utilService: UtilsService,
        public dialog: MatDialog,
    ) { }

    ngOnInit(): void {
    }

    displayTime(end_time) {
        const endTime = moment(end_time).format('MMMM Do YYYY HH:mm');
        return `${endTime}`;
    }

    displayCommision(campaign) {
        return this.utilService.displayCommission(campaign);
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
        const dialogRef = this.dialog.open(ConfirmDialogComponent, {
            width: '600px',
            data: {
                title: 'Confim Campaign Deletion',
                content: 'Are you sure you want to delete this campaign?'
            },
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.onDeleteCampaign.emit(this.campaign);
            }
        });
    }

    signupCampaign() {
        this.onSignupCampaign.emit(this.campaign);
    }

    computeRevenue(campaign: CampaignDetail) {
        let revenue = 0;
        if (this.campaignRevenue && campaign.brand_campaign_id && this.campaignRevenue[campaign.brand_campaign_id]) {
            revenue = this.campaignRevenue[campaign.brand_campaign_id];
        }
        return revenue;
    }

}
