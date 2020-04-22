import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { Router, ActivatedRoute } from '@angular/router';
import { AngularFirestore } from '@angular/fire/firestore';
import { AngularFireFunctions } from '@angular/fire/functions';
import { CampaignDetail } from 'src/types/campaign';
import { VideoPlayerComponent } from '../shared/video-player/video-player.component';

@Component({
    selector: 'app-video-review',
    templateUrl: './video-review.component.html',
    styleUrls: ['./video-review.component.scss'],
})
export class VideoReviewComponent implements OnInit {
    @ViewChild('videoPlayeer') videoPlayer: VideoPlayerComponent;
    @ViewChild('feedbackTextArea') textAreas: ElementRef;

    campaignId = '';
    historyId = '';
    newFeedback = '';
    campaign: CampaignDetail;
    sources = [];

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
        callable({ campaign_id: this.campaignId }).subscribe(result => {
            result.campaign_historys.forEach(campaign => {
                if (campaign.history_id === this.historyId) {
                    this.campaign = campaign;
                }
            });
            this.sources = [
                {
                    src: this.campaign.video,
                    type: 'video/mp4',
                },
            ];
            this.newFeedback = this.campaign.feed_back;
            console.log(this.campaign);
        });
    }

    provideFeedback() {
        console.log(this.campaign);
        const callable = this.fns.httpsCallable('provideFeedback');
        callable(
            {
                campaign_id: this.campaignId,
                history_id: this.historyId,
                feed_back: this.newFeedback,
            }
        ).subscribe(result => {
            console.log(result);
            this.router.navigate([
                `/campaign/${this.campaign.campaign_id}`,
            ]);
        });
    }

    approveVideo() {
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
                this.router.navigate([
                    `/campaign/${this.campaign.campaign_id}`,
                ]);
            });
        });
    }

    getTimeStamp() {
        const time = this.videoPlayer.getCurrentSecond();
        const minute = Math.floor(time / 60);
        const second = Math.round(time % 60);
        this.newFeedback = `${this.newFeedback  }\n [${minute}:${second}] `;
        this.textAreas.nativeElement.focus();
    }
}

