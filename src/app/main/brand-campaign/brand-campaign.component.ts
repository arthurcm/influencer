import { Component, OnInit } from '@angular/core';
import { CampaignService } from 'src/app/services/campaign.service';
import { LoadingSpinnerService } from 'src/app/services/loading-spinner.service';
import { ActivatedRoute, Router } from '@angular/router';
import { CampaignDetail } from 'src/types/campaign';
import { AngularFireAuth } from '@angular/fire/auth';

@Component({
    selector: 'app-brand-campaign',
    templateUrl: './brand-campaign.component.html',
    styleUrls: ['./brand-campaign.component.scss'],
})
export class BrandCampaignComponent implements OnInit {

    campaignId;
    campaign: CampaignDetail;
    isBrandView: boolean;

    constructor(
        private loadingService: LoadingSpinnerService,
        private campaignService: CampaignService,
        private activatedRoute: ActivatedRoute,
        private router: Router,
        private auth: AngularFireAuth,
    ) {

        this.campaignId = this.activatedRoute.snapshot.paramMap.get('id');
    }

    async ngOnInit() {
        this.loadingService.show();

        this.auth.idTokenResult.subscribe(idToken => {
            if (idToken.claims && idToken.claims.store_account === true) {
                this.isBrandView = true;
            } else {
                this.isBrandView = false;
            }
        });

        const brandCampaign = await this.campaignService.getBrandCampaignById(this.campaignId);
        brandCampaign.subscribe(campaign => {
            console.log(campaign);
            const extraInfo = campaign['extra_info'];
            if (typeof extraInfo === 'string') {
                campaign.extra_info  = JSON.parse(extraInfo);
            }
            this.campaign = campaign;
            this.loadingService.hide();
        });
    }

    async signupCampaign() {
        this.loadingService.show();
        const signupCampaign = await this.campaignService.signupCampaign(this.campaign);
        signupCampaign.subscribe(result => {
            console.log(result);
            // campaign_id
            this.loadingService.hide();
            this.router.navigate([`/app/campaign/${result.campaign_id}`]);
        });
    }

}
