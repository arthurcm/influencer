import { Component, OnInit, Input } from '@angular/core';
import { CampaignService } from 'src/app/services/campaign.service';
import { CampaignDetail } from 'src/types/campaign';
import { Router } from '@angular/router';

@Component({
  selector: 'app-influencer-card',
  templateUrl: './influencer-card.component.html',
  styleUrls: ['./influencer-card.component.scss']
})
export class InfluencerCardComponent implements OnInit {
    @Input() uid: string;
    @Input() campaignData: CampaignDetail;

    influencer;
    constructor(
        private campaignService: CampaignService,
        private router: Router,
    ) { }

    async ngOnInit() {
        const user = await this.campaignService.getInfluencerProfile(this.uid);
        user.subscribe(result => {
            this.influencer = result;
            console.log(result);
        })
    }

    hasDetail() {
        return this.campaignData.inf_campaign_dict[this.uid];
    }

    goToReview() {
        const uid = this.campaignData.inf_campaign_dict[this.uid];
        if (uid) {
            this.router.navigate([`/app/image-review/${uid}`])
        }
    }
}
