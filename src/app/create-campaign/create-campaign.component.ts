import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { AngularFireFunctions } from '@angular/fire/functions';
import { CampaignDetail } from 'src/types/campaign';

@Component({
  selector: 'app-create-campaign',
  templateUrl: './create-campaign.component.html',
  styleUrls: ['./create-campaign.component.scss']
})
export class CreateCampaignComponent implements OnInit {

  campaignData: CampaignDetail = {
    brand: '',
    campaign_name: '',
    commision_dollar: -1,
    contacts: '',
    content_concept: '',
    end_time: 1,
    feed_back: '',
    image: '',
    video: '',
    milestones: [],
  }

  campaignName = '';
  brand = '';
  commision = -1;
  contact = '';
  endTime = new Date();

  constructor(
    public auth: AngularFireAuth, 
    public router: Router,
    private fns: AngularFireFunctions,
  ) { 
    // this.createCampaign();
  }

  ngOnInit() {
  }

  campaignNameChange(value) {
    this.campaignData.campaign_name = value;
  }

  brandChange(value) {
    this.campaignData.brand = value;
  }

  commisionChange(value) {
    this.campaignData.commision_dollar = value;
  }
  contactChange(value) {
    this.campaignData.contacts = value;
  }

  endTimeChange(value: Date) {
    this.campaignData.end_time = value.getTime();
  }

  createCampaign() {
    console.log(this.campaignData);
    const callable = this.fns.httpsCallable('createCampaign');
    callable(this.campaignData).subscribe(result => {
      this.router.navigate(['/home']);
      console.log(result);
    });
  }



}
