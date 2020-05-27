import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { Router, ActivatedRoute } from '@angular/router';
import { AngularFirestore } from '@angular/fire/firestore';
import { AngularFireFunctions } from '@angular/fire/functions';
import { CampaignDetail } from 'src/types/campaign';
import { LoadingSpinnerService } from '../services/loading-spinner.service';
import { CampaignService } from '../services/campaign.service';
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
        public loadingService: LoadingSpinnerService,
        public campaignService: CampaignService,
    ) {
        this.campaignId = this.activatedRoute.snapshot.paramMap.get('campaignId');
        this.historyId = this.activatedRoute.snapshot.paramMap.get('historyId');
    }

    async ngOnInit() {
        this.loadingService.show();

        const campaign = await this.campaignService.getCampaignById(this.campaignId);
        campaign.subscribe(result => {
            console.log(result);
            result.history_list.forEach(campaign => {
                if (campaign.history_id === this.historyId) {
                    this.campaign = campaign;
                }
            });
            this.newFeedback = this.campaign.feed_back;
            this.loadingService.hide();
            console.log(this.campaign);
        });
    }

    async provideFeedback() {
        const data = {
            campaign_id: this.campaignId,
            history_id: this.historyId,
            feed_back: this.newFeedback,
        };
        console.log(this.campaign);
        this.loadingService.show();
        const feedback = await this.campaignService.provideFeedback(data, this.campaignId, this.historyId);
        feedback.subscribe(result => {
            console.log(result);
            this.loadingService.hide();
            this.router.navigate([
                `/app/campaign/${this.campaign.campaign_id}`,
            ]);
        });
    }

    async approveConcept() {
        this.loadingService.show();
        const data = {
            campaign_id: this.campaignId,
            history_id: this.historyId,
            feed_back: this.newFeedback,
        };
        const feedback = await this.campaignService.provideFeedback(data, this.campaignId, this.historyId);
        feedback.subscribe(result => {
            console.log(result);
            const callable2 = this.fns.httpsCallable('finalizeCampaign');
            callable2(
                {
                    campaign_id: this.campaignId,
                    history_id: this.historyId,
                }
            ).subscribe(result2 => {
                console.log(result2);
                this.loadingService.hide();
                this.router.navigate([
                    `/app/campaign/${this.campaign.campaign_id}`,
                ]);
            });
        });
    }
}
