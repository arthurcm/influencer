import { Component, OnInit } from '@angular/core';
import { CampaignService } from 'src/app/services/campaign.service';
import { LoadingSpinnerService } from 'src/app/services/loading-spinner.service';
import { ActivatedRoute } from '@angular/router';
import { CampaignDetail } from 'src/types/campaign';

@Component({
    selector: 'app-brand-campaign',
    templateUrl: './brand-campaign.component.html',
    styleUrls: ['./brand-campaign.component.scss'],
})
export class BrandCampaignComponent implements OnInit {

    campaignId;
    campaign: CampaignDetail;

    constructor(
        private loadingService: LoadingSpinnerService,
        private campaignService: CampaignService,
        private activatedRoute: ActivatedRoute,
    ) {

        this.campaignId = this.activatedRoute.snapshot.paramMap.get('id');
    }

    async ngOnInit() {
        this.loadingService.show();

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

}
