import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { AngularFireFunctions } from '@angular/fire/functions';
import { Campaign } from 'src/types/campaign';
import * as moment from 'moment';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
    campaigns: Campaign[];

    constructor(
        public auth: AngularFireAuth,
        public router: Router,
        private fns: AngularFireFunctions,
    ) {

    }

    ngOnInit() {
        const callable = this.fns.httpsCallable('getCampaign');
        callable({}).subscribe(result => {
            this.campaigns = result;
            console.log(result);
        });
    }

    logout() {
        this.auth.signOut().then(result => {
            this.router.navigate(['/login']);
        });
    }

    displayTime(campaign) {
        const endTime = moment(campaign.campaign_data.end_time).format('MMMM Do YYYY');
        const daysLeft = moment(campaign.campaign_data.end_time).diff(moment(), 'days');
        return `End time: ${endTime} (${daysLeft} days left)`;
    }

    createCampaign() {
        this.router.navigate(['/create-campaign']);
    }

    viewCampaign(campaign) {
        this.router.navigate([`/campaign/${  campaign.campaign_data.campaign_id}`]);
    }
}
