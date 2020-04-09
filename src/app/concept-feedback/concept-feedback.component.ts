import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { Router, ActivatedRoute } from '@angular/router';
import { AngularFirestore } from '@angular/fire/firestore';
import { AngularFireFunctions } from '@angular/fire/functions';
import { CampaignDetail } from 'src/types/campaign';

@Component({
    selector: 'app-concept-feedback',
    templateUrl: './concept-feedback.component.html',
    styleUrls: ['./concept-feedback.component.scss'],
})
export class ConceptFeedbackComponent implements OnInit {
    campaignId = '';
    historyId = '';
    newFeedback = '';
    campaign: CampaignDetail;

    constructor(
        public auth: AngularFireAuth,
        public router: Router,
        private fns: AngularFireFunctions,
        private afs: AngularFirestore,
        private activatedRoute: ActivatedRoute,
    ) {
        this.campaignId = this.activatedRoute.snapshot.paramMap.get('campaignId');
        this.historyId = this.activatedRoute.snapshot.paramMap.get('historyId');
    }

    ngOnInit(): void {
        const callable = this.fns.httpsCallable('getCampaign');
        callable({ campaignId: this.campaignId }).subscribe(result => {
            result.forEach(campaign => {
                if (campaign.history_id === this.historyId) {
                    this.campaign = campaign;
                }
            });
            console.log(this.campaign);
        });
    }

    provideFeedback() {

        const data = {
            campaignId: this.campaignId,
            campaign_id: this.campaignId,
            historyId: 'KEZf5E2jYQnohWlCUpmO',
            history_id: 'KEZf5E2jYQnohWlCUpmO',
            feed_back: this.newFeedback,
        };
        // this.campaign['campaignId'] = this.campaign.campaign_id;

        // this.campaign['historyId'] = 'KEZf5E2jYQnohWlCUpmO'; // this.campaign.history_id;
        // this.campaign.feed_back = this.newFeedback;

        console.log(this.campaign);
        const callable = this.fns.httpsCallable('provideFeedback');
        callable(data).subscribe(result => {
            console.log(result);
        });
    }

}
