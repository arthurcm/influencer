import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { Router, ActivatedRoute } from '@angular/router';
import { AngularFirestore } from '@angular/fire/firestore';
import { AngularFireFunctions } from '@angular/fire/functions';
import { CampaignDetail } from 'src/types/campaign';
import { LoadingSpinnerService } from '../services/loading-spinner.service';
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
    ) {
        this.campaignId = this.activatedRoute.snapshot.paramMap.get('campaignId');
        this.historyId = this.activatedRoute.snapshot.paramMap.get('historyId');
    }

    ngOnInit(): void {
        this.loadingService.show();
        const callable = this.fns.httpsCallable('getCampaign');
        callable({ campaign_id: this.campaignId }).subscribe(result => {
            console.log(result);
            result.campaign_historys.forEach(campaign => {
                if (campaign.history_id === this.historyId) {
                    this.campaign = campaign;
                }
            });
            this.newFeedback = this.campaign.feed_back;
            this.loadingService.hide();
            console.log(this.campaign);
        });
    }

    provideFeedback() {
        const data = {
            campaign_id: this.campaignId,
            history_id: this.historyId,
            feed_back: this.newFeedback,
        };
        console.log(this.campaign);
        this.loadingService.show();
        const callable = this.fns.httpsCallable('provideFeedback');
        callable(data).subscribe(result => {
            console.log(result);
            this.loadingService.hide();
            this.router.navigate([
                `/campaign/${this.campaign.campaign_id}`,
            ]);
        });
    }

    approveConcept() {
        this.loadingService.show();
        const callable = this.fns.httpsCallable('provideFeedback');
        callable(
            {
                campaign_id: this.campaignId,
                history_id: this.historyId,
                feed_back: this.newFeedback,
            }
        ).subscribe(result => {
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
                    `/campaign/${this.campaign.campaign_id}`,
                ]);
            });
        });
    }
}
