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
        callable({ campaignId: this.campaignId }).subscribe(result => {
            this.campaign = result[0];
            // with concept
            const conceptCampaignList = [];
            result.forEach(campaign => {
                if (campaign.content_concept) {
                    conceptCampaignList.push(campaign);
                }
            });
            this.conceptCampaignList = conceptCampaignList;
            this.campaignHistory = result;
            console.log(result);
        });
    }

    AddNewConcept() {
        this.campaign.content_concept = this.newContentConcept;
        // this.campaign.campaignId = this.campaign.campaign_id;
        console.log(this.campaign);
        const callable = this.fns.httpsCallable('updateCampaign');
        callable(this.campaign).subscribe(result => {
            console.log(result);
        });
    }


    leaveFeedback() {
        this.router.navigate([
            `/concept-feedback/${this.campaign.campaign_id}/${this.campaign.history_id}`,
        ]);
    }
}
