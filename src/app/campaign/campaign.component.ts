import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { AngularFireFunctions } from '@angular/fire/functions';
import { AngularFirestore } from '@angular/fire/firestore';

@Component({
  selector: 'app-campaign',
  templateUrl: './campaign.component.html',
  styleUrls: ['./campaign.component.scss']
})
export class CampaignComponent implements OnInit {
  campaignId = '123';
  campaign: {};

  itemsCollection;
  items;

  constructor(
    public auth: AngularFireAuth, 
    public router: Router,
    private fns: AngularFireFunctions,
    private afs: AngularFirestore,
  ) { 
    // this.itemsCollection = afs.collection<object>('campaigns');
    // this.items = this.itemsCollection.valueChanges();
    // this.items.subscribe(result => {
    //   console.log(result);
    // })
  }

  ngOnInit() {
    const callable = this.fns.httpsCallable('getCampaign');
    callable({ campaignId: this.campaignId }).subscribe(result => {
      this.campaign = result['_fieldsProto'];
      console.log(JSON.stringify(this.campaign));
    });
  }

}
