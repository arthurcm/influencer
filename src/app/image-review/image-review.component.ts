import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { Router, ActivatedRoute } from '@angular/router';
import { AngularFirestore } from '@angular/fire/firestore';
import { AngularFireFunctions } from '@angular/fire/functions';
import { CampaignDetail, VideoMetaData, ImageContent } from 'src/types/campaign';
import { VideoPlayerComponent } from '../shared/video-player/video-player.component';
import { LoadingSpinnerService } from '../services/loading-spinner.service';
import { CampaignService } from '../services/campaign.service';

@Component({
    selector: 'app-image-review',
    templateUrl: './image-review.component.html',
    styleUrls: ['./image-review.component.scss'],
})
export class ImageReviewComponent implements OnInit {

    campaign: CampaignDetail;
    campaignId = '';
    historyId = '';
    newFeedback = '';

    images: ImageContent;

    constructor(
        public auth: AngularFireAuth,
        public router: Router,
        private fns: AngularFireFunctions,
        private afs: AngularFirestore,
        private activatedRoute: ActivatedRoute,
        public loadingService: LoadingSpinnerService,
        private campaignService: CampaignService,
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
            this.images = JSON.parse(this.campaign.video);
            this.images.images.forEach(image => {
                this.campaignService.getImageMetaData(image['page']).subscribe(detection => {
                    console.log(detection);
                });
            });
            this.newFeedback = this.campaign.feed_back;
            console.log(this.campaign);
            this.loadingService.hide();
        });
    }


    provideFeedback() {
        console.log(this.campaign);
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
            this.loadingService.hide();
            this.router.navigate([
                `/campaign/${this.campaign.campaign_id}`,
            ]);
        });
    }

    approveImage() {
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
            const callable2 = this.fns.httpsCallable('finalizeVideoDraft');
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
