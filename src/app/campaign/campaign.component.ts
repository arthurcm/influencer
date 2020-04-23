import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { Router, ActivatedRoute } from '@angular/router';
import { AngularFireFunctions } from '@angular/fire/functions';
import { AngularFirestore } from '@angular/fire/firestore';
import { CampaignDetail } from 'src/types/campaign';
import { Route } from '@angular/compiler/src/core';
import { AngularFireStorage } from '@angular/fire/storage';
import { HttpHeaders, HttpClient, HttpParams } from '@angular/common/http';
import * as moment from 'moment';
import { LoadingSpinnerService } from '../shared/loading-spinner/loading-spinner.service';

@Component({
    selector: 'app-campaign',
    templateUrl: './campaign.component.html',
    styleUrls: ['./campaign.component.scss'],
})
export class CampaignComponent implements OnInit {
    campaignId = '';
    campaign: CampaignDetail;
    campaignHistory: CampaignDetail[];

    itemsCollection;
    items;

    conceptCampaignList: CampaignDetail[];
    videoCampaignList: CampaignDetail[];
    newContentConcept = '';
    uploadPath = '';

    constructor(
        public auth: AngularFireAuth,
        public router: Router,
        private fns: AngularFireFunctions,
        private afs: AngularFirestore,
        private activatedRoute: ActivatedRoute,
        private storage: AngularFireStorage,
        private http: HttpClient,
        public loadingService: LoadingSpinnerService,
    ) {
    // this.itemsCollection = afs.collection<object>('campaigns');
    // this.items = this.itemsCollection.valueChanges();
    // this.items.subscribe(result => {
    //   console.log(result);
    // })

        this.campaignId = this.activatedRoute.snapshot.paramMap.get('id');
        // this.getVideoMetaData('video/HK0fpmQI7WOGUDwdmVpPffis7hY2/dzXZ7bZe7Km55R7Aoqzf/qxLkbGSsY6jsKJeX6O1A/beauty_video_4.mov');
        // this.transcodeVideo('video/HK0fpmQI7WOGUDwdmVpPffis7hY2/dK5e3YW4qfTQgBfUOkqX/1586836863114');
    }

    ngOnInit() {
        this.loadingService.show();
        const callable = this.fns.httpsCallable('getCampaign');
        callable({ campaign_id: this.campaignId }).subscribe(result => {
            console.log(result);
            this.campaignHistory = result.campaign_historys;
            this.campaign = this.campaignHistory[0];
            // with concept
            const conceptCampaignList = [];
            const videoCampaignList = [];
            this.campaignHistory.forEach(campaign => {
                if (campaign.content_concept) {
                    if (result.final_history_id === campaign.history_id) {
                        campaign['is_final'] = true;
                    }
                    conceptCampaignList.push(campaign);
                } else if (campaign.video) {
                    if (result.final_video_draft_history_id === campaign.history_id) {
                        campaign['is_final'] = true;
                    }
                    videoCampaignList.push(campaign);
                }
            });
            this.conceptCampaignList = conceptCampaignList;
            this.videoCampaignList = videoCampaignList;

            this.loadingService.hide();

            this.auth.user.subscribe(reuslt => {
                this.uploadPath = `video/${result.uid}/${this.campaign.campaign_id}/`;
            });
        });
    }

    AddNewConcept() {
        const newCampaign = JSON.parse(JSON.stringify(this.campaign));
        newCampaign.content_concept = this.newContentConcept;
        newCampaign.feed_back = '';
        newCampaign.extra_info = JSON.stringify(newCampaign.extra_info);
        // this.campaign.campaignId = this.campaign.campaign_id;
        this.loadingService.show();
        console.log(newCampaign);
        const callable = this.fns.httpsCallable('updateCampaign');
        callable(newCampaign).subscribe(result => {
            console.log(result);
            this.conceptCampaignList.splice(0, 0, result.updated_campaign_data);
            this.loadingService.hide();
        });
    }

    leaveFeedback(campaign) {
        this.router.navigate([
            `/concept-feedback/${campaign.campaign_id}/${campaign.history_id}`,
        ]);
    }

    reviewVideo(campaign) {
        this.router.navigate([
            `/video-review/${campaign.campaign_id}/${campaign.history_id}`,
        ]);
    }

    uploadSuccess(videoUrl: string) {
        const newCampaign = JSON.parse(JSON.stringify(this.campaign));
        newCampaign.content_concept = '';
        newCampaign.feed_back = '';
        newCampaign.video = videoUrl;
        newCampaign.extra_info = JSON.stringify(newCampaign.extra_info);
        this.loadingService.show();
        // this.campaign.campaignId = this.campaign.campaign_id;
        console.log(newCampaign);
        const callable = this.fns.httpsCallable('updateCampaign');
        callable(newCampaign).subscribe(result => {
            console.log(result);
            this.videoCampaignList.splice(0, 0, result.updated_campaign_data);
            this.loadingService.hide();
        });
    }

    getVideoMetaData(videoUrl: string) {
        const data = {
            name: videoUrl,
            contentType: 'video/mp4',
        };

        const url = `http://video-transcoder-k8s.default.35.193.22.35.xip.io/get_video_meta/name/${encodeURIComponent(videoUrl)}`;

        const httpParms = new HttpParams().set('name', encodeURIComponent(videoUrl)).set('contentType', encodeURIComponent('video/mp4'));
        const httpOptions = {
            headers: new HttpHeaders({
                'Content-Type':  'application/json',
            }),
            // params: httpParms,
        };
        console.log(data);

        this.http.get<any>(url, httpOptions).subscribe(result => {
            console.log(result);
        });
    }

    transcodeVideo(videoUrl) {
        const data = {
            name: videoUrl,
            contentType: 'video/mp4',
        };

        const url = 'http://video-transcoder-k8s.default.35.193.22.35.xip.io/transcode_gcs';

        const httpOptions = {
            headers: new HttpHeaders({
                'Content-Type':  'application/json',
            }),
        };
        console.log(data);

        this.http.post<any>(url, data, httpOptions).subscribe(result => {
            console.log(result);
        });
    }

    displayTime(end_time) {
        const endTime = moment(end_time).format('MMMM Do YYYY HH:mm');
        return endTime;
    }
}
