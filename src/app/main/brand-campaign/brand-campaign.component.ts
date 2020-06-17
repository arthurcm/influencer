import { Component, OnInit } from '@angular/core';
import { CampaignService } from 'src/app/services/campaign.service';
import { LoadingSpinnerService } from 'src/app/services/loading-spinner.service';
import { ActivatedRoute, Router } from '@angular/router';
import { CampaignDetail } from 'src/types/campaign';
import { AngularFireAuth } from '@angular/fire/auth';
import { NotificationService, AlertType } from 'src/app/services/notification.service';

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
        private notification: NotificationService,
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
            this.loadingService.hide();
            console.log(result);
            if (result && result['campaign_id']) {
                this.notification.addMessage({
                    type: AlertType.Success,
                    title: 'Signup Succeed',
                    message: 'Your have signed up for this campaign.',
                    duration: 3000,
                });
                // campaign_id
                this.router.navigate([`/app/campaign/${result['campaign_id']}`]);
            } else if (result['status'] && result['status'] === 'already signed up') {
                this.notification.addMessage({
                    type: AlertType.Warning,
                    title: 'Signup Failed',
                    message: 'Your have signed up for this campaign before.',
                    duration: 3000,
                });
            }
        });
    }

}
