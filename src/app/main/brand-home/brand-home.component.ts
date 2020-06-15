import { Component, OnInit } from '@angular/core';
import { CampaignDetail } from 'src/types/campaign';
import { AngularFireAuth } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { LoadingSpinnerService } from 'src/app/services/loading-spinner.service';
import { CampaignService } from 'src/app/services/campaign.service';
import { BrandService } from 'src/app/services/brand.service';

@Component({
    selector: 'app-brand-home',
    templateUrl: './brand-home.component.html',
    styleUrls: ['./brand-home.component.scss']
})
export class BrandHomeComponent implements OnInit {

    brandCampaigns: CampaignDetail[];

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
        roi.subscribe(result => {
            console.log(result);
        });
        const track = await this.brandService.getBrandTrack();
        track.subscribe(result => {
            console.log(result);
        });
        const influencer = await this.brandService.getBrandInfluencer();
        influencer.subscribe(result => {
            console.log(result);
        });
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
