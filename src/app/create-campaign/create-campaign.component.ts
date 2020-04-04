import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { AngularFireFunctions } from '@angular/fire/functions';

@Component({
  selector: 'app-create-campaign',
  templateUrl: './create-campaign.component.html',
  styleUrls: ['./create-campaign.component.scss']
})
export class CreateCampaignComponent implements OnInit {

  data = {
    brand: 'abc',
    campaign_name: 'name',
    commision_dollar: '1000',
    contacts: 'abc@gmail.com',
    content_concept: 'loremaa avsidojw asdv awea avw',
    end_time: '2020/05/01',
    feed_back: '',
    image: '',
    video: '',
  }
  constructor(
    public auth: AngularFireAuth, 
    public router: Router,
    private fns: AngularFireFunctions,
  ) { 
    // this.createCampaign();
  }

  ngOnInit() {
  }

  createCampaign() {
    const callable = this.fns.httpsCallable('createCampaign');
    callable(this.data).subscribe(result => {
      console.log(result);
    });
  }



}
