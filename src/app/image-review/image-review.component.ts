import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { Router, ActivatedRoute } from '@angular/router';
import { AngularFirestore } from '@angular/fire/firestore';
import { AngularFireFunctions } from '@angular/fire/functions';
import { CampaignDetail, VideoMetaData, ImageContent, UploadFile } from 'src/types/campaign';
import { VideoPlayerComponent } from '../shared/video-player/video-player.component';
import { LoadingSpinnerService } from '../services/loading-spinner.service';
import { CampaignService } from '../services/campaign.service';
import { NguCarouselConfig, NguCarousel, NguCarouselStore } from '@ngu/carousel';
import { NotificationService, AlertType } from '../services/notification.service';

@Component({
    selector: 'app-image-review',
    templateUrl: './image-review.component.html',
    styleUrls: ['./image-review.component.scss'],
})
export class ImageReviewComponent implements OnInit {

    campaign: CampaignDetail;
    campaignId = '';
    historyId = '';
    historyList: CampaignDetail[];
    newFeedback = '';

    images: ImageContent;
    selectedMedia: UploadFile;
    allMedia: UploadFile[];

    public carouselTileItems: Array<any>;
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
        public loadingService: LoadingSpinnerService,
        private campaignService: CampaignService,
        private notification: NotificationService,
    ) {
        this.campaignId = this.activatedRoute.snapshot.paramMap.get('campaignId');
        // this.historyId = this.activatedRoute.snapshot.paramMap.get('historyId');
    }

    resetFn() {
        this.carouselLarge.reset(true);
        this.carouselSmall.reset(true);
    }
    
    moveToSlide() {
        this.carouselLarge.moveTo(2, false);
    }

    async ngOnInit() {
        this.loadingService.show();

        const campaign = await this.campaignService.getCampaignById(this.campaignId);
        campaign.subscribe(result => {
            console.log(result);
            const allMedia: UploadFile[] = [];
            for (let i = 0; i < result.history_list.length; i ++) {
                const campaign = result.history_list[i];
                campaign['version_name'] = (result.history_list.length - i);

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
            this.allMedia = allMedia;
            this.historyList = result.history_list;
            this.selectVersion(result.history_list[0]);
            this.newFeedback = this.campaign.feed_back;
            console.log(this.campaign);
            this.loadingService.hide();
        });

        const media = await this.campaignService.getAllMediaForCampaign('image', this.campaignId);
        media.subscribe(result => {
            console.log(result);
        });

    }

    selectVersion(version) {
        console.log(version);
        this.historyId = version.history_id;
        this.campaign = version;
        this.loadVersionData();
    }

    loadVersionData() {
        try {
            this.images = JSON.parse(this.campaign.video);
            this.carouselTileItems = this.images.images;
            // this.images.images.forEach(image => {
            //     this.campaignService.getImageMetaData(image.path).subscribe(detection => {
            //         console.log(detection);
            //     });
            // });
            if (this.images.images.length > 0) {
                this.selectedMedia = this.images.images[0];
            }
        } catch (e) {
            console.log(e);
            this.images = {
                images: [],
                caption: '',
            };
            this.carouselTileItems = [];
        }
        
    }

    async provideFeedback() {
        console.log(this.campaign);
        this.loadingService.show();
        const data = {
            campaign_id: this.campaignId,
            history_id: this.historyId,
            feed_back: this.newFeedback,
        };
        const feedback = await this.campaignService.provideFeedback(data, this.campaignId, this.historyId);
        feedback.subscribe(result => {
            console.log(result);
            this.loadingService.hide();
            this.router.navigate([
                `/campaign/${this.campaign.campaign_id}`,
            ]);
        });
    }

    async approveImage() {
        this.loadingService.show();
        const data = {
            campaign_id: this.campaignId,
            history_id: this.historyId,
            feed_back: this.newFeedback,
        };
        const feedback = await this.campaignService.finalizeCampaign(data, this.campaignId, this.historyId);
        feedback.subscribe(result => {
            console.log(result);

            this.loadingService.hide();
            if (result['status'] && result['status'] === 'OK') {
                this.notification.addMessage({
                    type: AlertType.Success,
                    title: 'Contents Approved',
                    message: 'Your have approved the contents for posting.',
                    duration: 3000,
                });
            } else {
                this.notification.addMessage({
                    type: AlertType.Error,
                    title: 'Error',
                    message: 'Error during campaign approval. Please try again.',
                    duration: 3000,
                });
            }

        });
    }

    slideLargeImageLeft() {
        const index = Math.max(0, this.carouselLarge.currentSlide - 1);
        this.selectedMedia = this.carouselTileItems[index];
    }

    slideLargeImageRight() {
        const index = Math.min(this.carouselTileItems.length - 1, this.carouselLarge.currentSlide + 1);
        this.selectedMedia = this.carouselTileItems[index];
    }

    clickSmallImage(item) {
        console.log(item);
        this.selectedMedia = item;
        const index = this.carouselTileItems.map(file => file.path).indexOf(item.path);
        this.carouselLarge.moveTo(index, false);
    }
}
