import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { Router, ActivatedRoute } from '@angular/router';
import { AngularFireFunctions } from '@angular/fire/functions';
import { AngularFirestore } from '@angular/fire/firestore';
import { CampaignDetail } from 'src/types/campaign';
import { Route } from '@angular/compiler/src/core';
import { AngularFireStorage } from '@angular/fire/storage';

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

    constructor(
        public auth: AngularFireAuth,
        public router: Router,
        private fns: AngularFireFunctions,
        private afs: AngularFirestore,
        private activatedRoute: ActivatedRoute,
        private storage: AngularFireStorage,
    ) {
    // this.itemsCollection = afs.collection<object>('campaigns');
    // this.items = this.itemsCollection.valueChanges();
    // this.items.subscribe(result => {
    //   console.log(result);
    // })

        this.campaignId = this.activatedRoute.snapshot.paramMap.get('id');
    }

    ngOnInit() {
        const callable = this.fns.httpsCallable('getCampaign');
        callable({ campaign_id: this.campaignId }).subscribe(result => {
            console.log(result);
            this.campaignHistory = result.campaign_hisotrys;
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
        });
    }

    AddNewConcept() {
        const newCampaign = JSON.parse(JSON.stringify(this.campaign));
        newCampaign.content_concept = this.newContentConcept;
        newCampaign.feed_back = '';
        // this.campaign.campaignId = this.campaign.campaign_id;
        console.log(newCampaign);
        const callable = this.fns.httpsCallable('updateCampaign');
        callable(newCampaign).subscribe(result => {
            console.log(result);
            this.conceptCampaignList.splice(0, 0, result.updated_campaign_data);
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
        // this.campaign.campaignId = this.campaign.campaign_id;
        console.log(newCampaign);
        const callable = this.fns.httpsCallable('updateCampaign');
        callable(newCampaign).subscribe(result => {
            console.log(result);
            this.videoCampaignList.splice(0, 0, result.updated_campaign_data);
        });
    }
}
