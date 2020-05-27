import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { Router, ActivatedRoute } from '@angular/router';
import { AngularFireFunctions } from '@angular/fire/functions';
import { AngularFirestore } from '@angular/fire/firestore';
import { CampaignDetail } from 'src/types/campaign';
import { Route } from '@angular/compiler/src/core';
import { AngularFireStorage } from '@angular/fire/storage';
import * as moment from 'moment';
import { LoadingSpinnerService } from '../../services/loading-spinner.service';
import { CampaignService } from '../../services/campaign.service';
import { MatDialog } from '@angular/material/dialog';
import { UploadVideoDialogComponent } from './upload-video-dialog/upload-video-dialog.component';
import { UploadImageDialogComponent } from './upload-image-dialog/upload-image-dialog.component';
import { SendMessageDialogComponent } from './send-message-dialog/send-message-dialog.component';

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

    campaignType = '';

    constructor(
        public auth: AngularFireAuth,
        public router: Router,
        private fns: AngularFireFunctions,
        private afs: AngularFirestore,
        private activatedRoute: ActivatedRoute,
        private storage: AngularFireStorage,
        public loadingService: LoadingSpinnerService,
        public campaignService: CampaignService,
        public dialog: MatDialog,
    ) {
    // this.itemsCollection = afs.collection<object>('campaigns');
    // this.items = this.itemsCollection.valueChanges();
    // this.items.subscribe(result => {
    //   console.log(result);
    // })

        this.campaignId = this.activatedRoute.snapshot.paramMap.get('id');
        // this.transcodeVideo('video/HK0fpmQI7WOGUDwdmVpPffis7hY2/dK5e3YW4qfTQgBfUOkqX/1586836863114');
    }

    async ngOnInit() {
        this.loadingService.show();

        const campaign = await this.campaignService.getCampaignById(this.campaignId);
        campaign.subscribe(result => {
            console.log(result);
            this.campaignHistory = result.history_list;
            this.campaign = this.campaignHistory[0];
            // with concept
            const conceptCampaignList = [];
            const videoCampaignList = [];
            this.campaignHistory.forEach(campaign => {
                if (campaign.content_concept) {
                    if (result.finalized_campaign_data.final_history_id === campaign.history_id) {
                        campaign['is_final'] = true;
                    }
                    conceptCampaignList.push(campaign);
                } else if (campaign.video) {
                    if (result.finalized_campaign_data.final_video_draft_history_id === campaign.history_id) {
                        campaign['is_final'] = true;
                    }
                    if (this.campaign.extra_info['type'] === 'image') {
                        campaign.images = JSON.parse(campaign.video);
                    }
                    videoCampaignList.push(campaign);
                }

            });
            this.conceptCampaignList = conceptCampaignList;
            this.videoCampaignList = videoCampaignList;

            this.loadingService.hide();

            this.auth.user.subscribe(user => {
                if (this.campaign.extra_info['type'] !== 'image') {
                    this.uploadPath = `video/${user.uid}/${this.campaign.campaign_id}/`;
                    this.campaignType = 'video';
                } else {
                    this.uploadPath = `image/${user.uid}/${this.campaign.campaign_id}/`;
                    this.campaignType = 'image';
                }

            });
            this.loadingService.hide();
        });

    }

    async AddNewConcept() {
        const newCampaign = JSON.parse(JSON.stringify(this.campaign));
        newCampaign.content_concept = this.newContentConcept;
        newCampaign.feed_back = '';
        newCampaign.extra_info = JSON.stringify(newCampaign.extra_info);
        // this.campaign.campaignId = this.campaign.campaign_id;
        this.loadingService.show();
        console.log(newCampaign);
        const campaign = await this.campaignService.updateCampaignById(newCampaign, this.campaignId);
        campaign.subscribe(result => {
            console.log(result);
            this.conceptCampaignList.splice(0, 0, newCampaign);
            this.loadingService.hide();
        });
    }

    leaveFeedback(campaign) {
        this.router.navigate([
            `/app/concept-feedback/${campaign.campaign_id}/${campaign.history_id}`,
        ]);
    }

    reviewVideo(campaign) {
        this.router.navigate([
            `/app/video-review/${campaign.campaign_id}/${campaign.history_id}`,
        ]);
    }

    reviewImages(campaign) {
        this.router.navigate([
            `/app/image-review/${campaign.campaign_id}/${campaign.history_id}`,
        ]);
    }

    shareImages(campaign) {
        const dialogRef = this.dialog.open(SendMessageDialogComponent, {
            width: '600px',
            data: {

            },
        });

        dialogRef.afterClosed().subscribe(message => {
            if (message) {
                const url = `/app/image-review/${campaign.campaign_id}/${campaign.history_id}`;
                this.campaignService.shareContent(message.receiver, 'shanshuo0918@gmail.com', url).subscribe(result => {
                    console.log(result);
                });
            }
        });
    }

    shareConcept(campaign) {

        const dialogRef = this.dialog.open(SendMessageDialogComponent, {
            width: '600px',
            data: {

            },
        });

        dialogRef.afterClosed().subscribe(message => {
            if (message) {
                const url = `/app/video-review/${campaign.campaign_id}/${campaign.history_id}`;
                this.campaignService.shareContent(message.receiver, 'shanshuo0918@gmail.com', url).subscribe(result => {
                    console.log(result);
                });
            }
        });

    }

    shareVideo(campaign) {
        const dialogRef = this.dialog.open(SendMessageDialogComponent, {
            width: '600px',
            data: {

            },
        });

        dialogRef.afterClosed().subscribe(message => {
            if (message) {
                const url = `/app/concept-feedback/${campaign.campaign_id}/${campaign.history_id}`;
                this.campaignService.shareContent(message.receiver, 'shanshuo0918@gmail.com', url).subscribe(result => {
                    console.log(result);
                });
            }
        });

    }

    async uploadYoutubeSuccess(youtubeLink) {
        const newCampaign = JSON.parse(JSON.stringify(this.campaign));
        newCampaign.content_concept = '';
        newCampaign.feed_back = '';
        newCampaign.video = youtubeLink;
        newCampaign.extra_info = JSON.stringify(newCampaign.extra_info);
        this.loadingService.show();

        console.log(newCampaign);
        const campaign = await this.campaignService.updateCampaignById(newCampaign, this.campaignId);
        campaign.subscribe(result => {
            console.log(result);
            this.videoCampaignList.splice(0, 0, newCampaign);
            this.loadingService.hide();
        });
    }

    async uploadSuccess(video) {
        const newCampaign = JSON.parse(JSON.stringify(this.campaign));
        newCampaign.content_concept = '';
        newCampaign.feed_back = '';
        newCampaign.video = video['url'];
        newCampaign.extra_info = JSON.stringify(newCampaign.extra_info);
        this.loadingService.show();
        // this.campaign.campaignId = this.campaign.campaign_id;
        console.log(newCampaign);
        const campaign = await this.campaignService.updateCampaignById(newCampaign, this.campaignId);
        campaign.subscribe(result => {
            console.log(result);
            this.videoCampaignList.splice(0, 0, newCampaign);
            this.campaignService.transcodeVideo(video['path']).subscribe(reuslt => {
                console.log(result);
            });
            this.loadingService.hide();
        });
    }

    async uploadImageSuccess(images) {
        const newCampaign = JSON.parse(JSON.stringify(this.campaign));
        newCampaign.content_concept = '';
        newCampaign.feed_back = '';
        newCampaign.video = JSON.stringify(images);
        newCampaign.extra_info = JSON.stringify(newCampaign.extra_info);
        this.loadingService.show();
        // this.campaign.campaignId = this.campaign.campaign_id;
        console.log(newCampaign);
        const campaign = await this.campaignService.updateCampaignById(newCampaign, this.campaignId);
        campaign.subscribe(result => {
            console.log(result);
            this.videoCampaignList.splice(0, 0, newCampaign);
            this.loadingService.hide();
        });
    }

    uploadImages() {
        const dialogRef = this.dialog.open(UploadImageDialogComponent, {
            width: '600px',
            data: {
                uploadPath: this.uploadPath,
            },
        });

        dialogRef.afterClosed().subscribe(result => {
            console.log(`Dialog result: ${result}`);
            if (result) {
                this.uploadImageSuccess(result);
            }
        });
    }

    uploadVideo() {
        const dialogRef = this.dialog.open(UploadVideoDialogComponent, {
            width: '600px',
            data: {
                uploadPath: this.uploadPath,
            },
        });

        dialogRef.afterClosed().subscribe(result => {
            console.log(`Dialog result: ${result}`);
            if (result) {
                if (result['type'] === 'local') {
                    this.uploadSuccess(result['file']);
                } else if (result['type'] === 'youtube') {
                    this.uploadYoutubeSuccess(result['link']);
                }
            }
        });
    }

    displayTime(end_time) {
        const endTime = moment(end_time).format('MMMM Do YYYY HH:mm');
        return endTime;
    }
}
