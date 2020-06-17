import { Component, OnInit } from '@angular/core';
import { CampaignDetail } from 'src/types/campaign';
import { AngularFireAuth } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { LoadingSpinnerService } from 'src/app/services/loading-spinner.service';
import { CampaignService } from 'src/app/services/campaign.service';
import { BrandService } from 'src/app/services/brand.service';
import { forkJoin } from 'rxjs';

import * as moment from 'moment';

@Component({
    selector: 'app-brand-home',
    templateUrl: './brand-home.component.html',
    styleUrls: ['./brand-home.component.scss']
})
export class BrandHomeComponent implements OnInit {

    brandCampaigns: CampaignDetail[];

    statistic = {
        roi: 0,
        revenue: 0,
        total_commission: 0,
        visit: 0,
        influencer_count: 0,
    }
    chartData: any;

    constructor(
        public auth: AngularFireAuth,
        public router: Router,
        public loadingService: LoadingSpinnerService,
        public campaignService: CampaignService,
        public brandService: BrandService,
    ) { }

    async ngOnInit() {
        // Get User Info
        const user =  await this.auth.currentUser;
        this.loadBrandCampaign();
        this.loadBrandStats();
    }

    async loadBrandCampaign() {
        const brand_campaign = await this.campaignService.getBrandCampaign();
        brand_campaign.subscribe(result => {
            console.log(result);
            result.forEach(campaign => {
                const extraInfo = campaign['extra_info'];
                if ( typeof extraInfo === 'string') {
                    campaign.extra_info  = JSON.parse(extraInfo);
                }
            });
            this.brandCampaigns = result;
            this.loadingService.hide();
        });
    }

    async loadBrandStats() {
        const roi = await this.brandService.getBrandROI();
        const track = await this.brandService.getBrandTrack();
        const influencer = await this.brandService.getBrandInfluencer();

        forkJoin([
            roi,
            track,
            influencer,
        ]).subscribe(data => {
            console.log(data);
            const roiData = data[0];
            const trackData = data[1];
            const influencerData = data[2];
            this.statistic['roi'] = roiData['ROI'];
            this.statistic['total_commission'] = roiData['total_commission'];
            this.statistic['revenue'] = roiData['revenue']['shop_revenue'];
            this.statistic['influencer_count'] = influencerData['influencer_counts'];
            this.statistic['visit'] = trackData['visit_counts'];

            //daily_visit: {2020-06-09: 3, 2020-06-15: 4}
            const visitTimeseries = trackData['daily_visit'];
            const revenueTs = roiData['revenue']['revenue_ts'];
            const revenueTimeseries = {};
            revenueTs.forEach(point => {
                // daily_revenue: 146 order_date: "Mon, 15 Jun 2020 00:00:00 GMT"
                const date = moment(point['order_date']).format('YYYY-MM-DD')
                console.log(date);
                revenueTimeseries[date] = point['daily_revenue'];
            })

            this.chartData = {
                revenue: revenueTimeseries,
                visit: visitTimeseries,
            }
        })
    }

    async deleteCampaign(campaign: CampaignDetail) {
        this.loadingService.show();
        console.log(campaign);
        const deleteCampaign = await this.campaignService.deleteCampaignById(campaign.campaign_id);

        deleteCampaign.subscribe(result => {
            let index = -1;
            for (let i = 0; i < this.brandCampaigns.length; i ++) {
                if (campaign.campaign_id === this.brandCampaigns[i].campaign_id) {
                    index = i;
                    break;
                }
            }
            this.brandCampaigns.splice(index, 1);
            this.loadingService.hide();
            console.log(this.brandCampaigns);
        });
    }

    createCampaign() {
        this.router.navigate(['/app/create-campaign']);
    }
}
