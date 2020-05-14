import { Component, OnInit, ViewChild } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { Campaign } from 'src/types/campaign';
import * as moment from 'moment';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { LoadingSpinnerService } from '../../services/loading-spinner.service';
import { CampaignService } from 'src/app/services/campaign.service';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
    campaigns: Campaign[];
    campaignDataSource: MatTableDataSource<Campaign>;

    @ViewChild(MatSort, {static: true}) sort: MatSort;

    displayedColumns = ['type', 'campaign_name', 'end_time', 'post_time', 'brand', 'commision_dollar', 'link'];

    constructor(
        public auth: AngularFireAuth,
        public router: Router,
        public loadingService: LoadingSpinnerService,
        public campaignService: CampaignService,
    ) {

    }

    async ngOnInit() {
        this.loadingService.show();
        const campaign = await this.campaignService.getAllCampaignForUser();
        campaign.subscribe(result => {
            this.campaigns = result.filter(campaign => {
                return campaign.campaign_data;
            });
            this.campaignDataSource = new MatTableDataSource(this.campaigns);
            console.log(result);
            this.loadingService.hide();
        });
    }

    logout() {
        this.auth.signOut().then(result => {
            this.router.navigate(['/login']);
        });
    }

    displayTime(end_time) {
        const endTime = moment(end_time).format('MMMM Do YYYY HH:mm');
        const daysLeft = moment(end_time).diff(moment(), 'days');
        return `${endTime} (${daysLeft} days left)`;
    }

    createCampaign() {
        this.router.navigate(['/create-campaign']);
    }

    viewCampaign(campaign) {
        this.router.navigate([`/campaign/${campaign.campaign_data.campaign_id}`]);
    }

    deleteCampaign(campaign) {
        // this.loadingService.show();
        // const callable = this.fns.httpsCallable('deleteCampaign');
        // console.log(campaign);
        // callable({
        //     campaign_id: campaign.campaign_data.campaign_id,
        // }).subscribe(result => {
        //     let index = -1;
        //     for (let i = 0; i < this.campaigns.length; i ++) {
        //         if (campaign.campaign_data.campaign_id === this.campaigns[i].campaign_data.campaign_id) {
        //             index = i;
        //             break;
        //         }
        //     }
        //     this.campaigns.splice(index, 1);
        //     this.campaignDataSource = new MatTableDataSource(this.campaigns);
        //     this.loadingService.hide();
        //     console.log(this.campaigns);
        // });
    }

    sortData(sort) {
        console.log(event);

        const data = this.campaigns.slice();
        if (!sort.active || sort.direction === '') {
            this.campaignDataSource = new MatTableDataSource(data);
            return;
        }

        this.campaignDataSource = new MatTableDataSource(
            data.sort(
                (a, b) => {
                    const isAsc = sort.direction === 'asc';
                    switch (sort.active) {
                    case 'commision_dollar': return compare(a.campaign_data.commision_dollar, b.campaign_data.commision_dollar, isAsc);
                    case 'campaign_name': return compare(a.campaign_data.campaign_name, b.campaign_data.campaign_name, isAsc);
                    case 'brand': return compare(a.campaign_data.brand, b.campaign_data.brand, isAsc);
                    case 'end_time': return compare(a.campaign_data.end_time, b.campaign_data.end_time, isAsc);
                    case 'post_time': return compare(
                        a.campaign_data.extra_info ? a.campaign_data.extra_info['post_time'] : 0,
                        b.campaign_data.extra_info ? b.campaign_data.extra_info['post_time'] : 0, isAsc);
                    default: return 0;
                    }
                }
            )
        );
    }

}

function compare(a: number | string, b: number | string, isAsc: boolean) {
    return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
}
