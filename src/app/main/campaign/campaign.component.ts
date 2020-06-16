import { Component, OnInit, ViewChild } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { Router, ActivatedRoute } from '@angular/router';
import { AngularFireFunctions } from '@angular/fire/functions';
import { AngularFirestore } from '@angular/fire/firestore';
import { CampaignDetail, ImageContent, UploadFile } from 'src/types/campaign';
import { Route } from '@angular/compiler/src/core';
import { AngularFireStorage } from '@angular/fire/storage';
import * as moment from 'moment';
import { LoadingSpinnerService } from '../../services/loading-spinner.service';
import { CampaignService } from '../../services/campaign.service';
import { MatDialog } from '@angular/material/dialog';
import { UploadVideoDialogComponent } from './upload-video-dialog/upload-video-dialog.component';
import { UploadImageDialogComponent } from './upload-image-dialog/upload-image-dialog.component';
import { SendMessageDialogComponent } from './send-message-dialog/send-message-dialog.component';
import { NguCarouselConfig, NguCarousel } from '@ngu/carousel';

@Component({
    selector: 'app-campaign',
    templateUrl: './campaign.component.html',
    styleUrls: ['./campaign.component.scss'],
})
export class CampaignComponent implements OnInit {
    campaignId = '';
    campaign: CampaignDetail;
    campaignHistory: CampaignDetail[];
    historyId = '';

    itemsCollection;
    items;

    conceptCampaignList: CampaignDetail[];
    videoCampaignList: CampaignDetail[];
    newContentConcept = '';
    newTitle = '';
    newDescription = '';
    uploadPath = '';

    campaignType = '';
    selectedTab = 'overview';

    defaultImage: UploadFile = {
        path: 'new',
        url: 'new',
    };
    images: ImageContent;
    imageSlides: UploadFile[];
    selectedMedia: UploadFile;
    allMedia: UploadFile[];

    public carouselTileItems: Array<UploadFile> = [
        {
            'url': 'new',
            'path': 'new',
        }
    ];
    public carouselTileLarge: NguCarouselConfig = {
        grid: {xs: 1, sm: 1, md: 1, lg: 1, all: 0},
        slide: 1,
        speed: 400,
        animation: 'lazy',
        point: {
            visible: true
        },
        load: 2,
        touch: true,
        easing: 'ease'
    };
    public carouselTileSmall: NguCarouselConfig = {
        grid: {xs: 0, sm: 0, md: 0, lg: 0, all: 320},
        slide: 2,
        speed: 400,
        animation: 'lazy',
        point: {
            visible: true
        },
        load: 2,
        touch: true,
        easing: 'ease'
    };
    @ViewChild('carouselLarge') carouselLarge: NguCarousel<any>;
    @ViewChild('carouselSmall') carouselSmall: NguCarousel<any>;

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

        const campaign = await this.campaignService.getCampaignByIdInfluencer(this.campaignId);
        campaign.subscribe(result => {
            console.log(result);

            this.campaignHistory = result.history_list;
            // with concept
            const conceptCampaignList = [];
            const videoCampaignList = [];
            const allMedia = [];
            for (let i = 0; i < this.campaignHistory.length; i ++) {
                const campaign = this.campaignHistory[i];
                campaign['version_name'] = this.campaignHistory.length - i;
                const extraInfo = campaign['extra_info'];
                if ( typeof extraInfo === 'string') {
                    campaign.extra_info  = JSON.parse(extraInfo);
                }
                if (campaign.content_concept && result.finalized_campaign_data) {
                    if (result.finalized_campaign_data.final_history_id === campaign.history_id) {
                        campaign['is_final'] = true;
                    }
                    conceptCampaignList.push(campaign);
                } 
                if (campaign.video && result.finalized_campaign_data) {
                    if (result.finalized_campaign_data.final_video_draft_history_id === campaign.history_id) {
                        campaign['is_final'] = true;
                    }
                    if (campaign.extra_info['type'] === 'image') {
                        campaign.images = JSON.parse(campaign.video);
                        
                        try {
                            const images = JSON.parse(campaign.video);
                            images.images.forEach(image => {
                                if (allMedia.map(file => file.path).indexOf(image.path) < 0) {
                                    allMedia.push(image);
                                }
                            });
                        } catch (e) {
                            console.warn(e);
                        }
                    }
                    videoCampaignList.push(campaign);
                }
            };
            this.allMedia = allMedia;

            this.conceptCampaignList = conceptCampaignList;
            this.videoCampaignList = videoCampaignList;

            
            this.campaign = this.campaignHistory[0];
            this.selectVersion(this.campaign);

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

    selectVersion(campaign: CampaignDetail) {
        this.historyId = campaign.history_id;
        this.newContentConcept = campaign.content_concept;
        this.newTitle = campaign.title;
        this.newDescription = campaign.description;
        try {
            this.images = JSON.parse(JSON.stringify(campaign.images));
        } catch (e) {
            this.images = JSON.parse(JSON.stringify({images: [] }));
        }

        this.imageSlides = [this.defaultImage, ...this.images.images];
        this.selectedMedia = this.images.images[0];
        console.log(this.images);
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

    async updateCampaignVersion() {
        const newCampaign = JSON.parse(JSON.stringify(this.campaign));
        if (this.newContentConcept) {
            newCampaign.content_concept = this.newContentConcept;
        }
        if (this.newTitle) {
            newCampaign.title = this.newTitle;
        }
        if (this.newTitle) {
            newCampaign.description = this.newDescription;
        }
        newCampaign.feed_back = '';
        newCampaign.extra_info = JSON.stringify(newCampaign.extra_info);
        newCampaign.video = JSON.stringify(this.images);


        this.loadingService.show();
        console.log(newCampaign);
        const campaign = await this.campaignService.updateCampaignById(newCampaign, this.campaignId);
        campaign.subscribe(result => {
            console.log(result);
            newCampaign.history_id = result['history_id'];
            newCampaign['version_name'] = this.campaignHistory.length + 1;
            this.campaignHistory = [newCampaign, ...this.campaignHistory];
            this.historyId = result['history_id'];
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

    async uploadImageSuccess(images: ImageContent) {
        this.images.images = [...images.images, ...this.images.images];
        this.imageSlides = [this.defaultImage, ...this.images.images];
        this.allMedia = [...this.allMedia, ...images.images];
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

    async completeCampaign() {
        const completeCampaign = await this.campaignService.completeCampaign(this.campaign);
        completeCampaign.subscribe(result => {
            console.log(result);
            this.router.navigate(['/app/home']);
        });

    }

    deleteImage(index) {
        this.images.images.splice(index - 1, 1);
        this.imageSlides.splice(index, 1);
    }

    displayTime(end_time) {
        const endTime = moment(end_time).format('MMMM Do YYYY HH:mm');
        return endTime;
    }

    slideLargeImageLeft() {
        const index = Math.max(0, this.carouselLarge.currentSlide - 1);
        this.selectedMedia = this.images.images[index];
    }

    slideLargeImageRight() {
        const index = Math.min(this.images.images.length - 1, this.carouselLarge.currentSlide + 1);
        this.selectedMedia = this.images.images[index];
    }

    clickSmallImage(item) {
        console.log(item);
        if (item.path !== 'new') {
            this.selectedMedia = item;
            const index = this.images.images.map(file => file.path).indexOf(item.path);
            this.carouselLarge.moveTo(index, false);
        }
    }
}
