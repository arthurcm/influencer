import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { AngularFireFunctions } from '@angular/fire/functions';
import { CampaignDetail, CampaignExtraInfo, CommissionType } from 'src/types/campaign';
import { FormControl } from '@angular/forms';
import * as moment from 'moment';
import { LoadingSpinnerService } from '../../services/loading-spinner.service';
import { UploadContractDialogComponent } from './upload-contract-dialog/upload-contract-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { CampaignService } from 'src/app/services/campaign.service';
// import { default as _rollupMoment, Moment, MomentFormatSpecification, MomentInput } from 'moment';
// const moment = _rollupMoment || _moment;

@Component({
    selector: 'app-create-campaign',
    templateUrl: './create-campaign.component.html',
    styleUrls: ['./create-campaign.component.scss'],
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
        requirements: [],
        shipping_address: '',
        tracking_number: '',
        extra_info: '',
    };

    extraInfo: CampaignExtraInfo = {
        platform: '',
        contracts: [],
        commissionType: CommissionType.ONE_TIME_PAY,
    };

    campaignName = '';
    campaignType = 'video';
    brand = '';
    commision = -1;
    contactName = '';
    contactEmail = '';
    endDate = new Date();
    endTime = moment();
    postDate = new Date();
    postTime = moment();
    milestones = [];
    newMilestone = '';
    newRequirement = '';

    uploadedContract = [];

    platform = new FormControl([]);
    platformList: string[] = ['Youtube', 'Instagram', 'Weibo', 'Tiktok'];
    commissionType = new FormControl(CommissionType.ONE_TIME_PAY);

    commissionTypeList = Object.keys(CommissionType).map(key => CommissionType[key]);
    brandInfo = {

    };

    isBrandView = false;

    constructor(
        public auth: AngularFireAuth,
        public router: Router,
        private fns: AngularFireFunctions,
        public loadingService: LoadingSpinnerService,
        public dialog: MatDialog,
        public campaignService: CampaignService,
    ) {
        // this.createCampaign();
    }

    async ngOnInit() {

        this.auth.idTokenResult.subscribe(user => {
            console.log(user.claims);
            if (user.claims && user.claims.store_account === true) {
                this.isBrandView = true;
                this.brand = user.claims.store_name;
                this.campaignData.brand = user.claims.store_name;
                this.contactName = user.claims.store_name;
                this.contactEmail = user.claims.store_email;
                this.campaignData.contacts = `${this.contactName} <${this.contactEmail}>`;
            }
            // this.brandInfo = {
            //     brand: user.uid,
            //     contactName: user.uid,
            //     contactEmail: user.email,
            // };
        });
        const commission_type = await this.campaignService.getCommissionType();
        commission_type.subscribe(types => {
            console.log(types);
        });
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
    contactNameChange(value) {
        // Alex Subramanyan <asub@yelp.com>
        this.campaignData.contacts = `${this.contactName} <${this.contactEmail}>`;
    }
    contactEmailChange(value) {
        this.campaignData.contacts = `${this.contactName} <${this.contactEmail}>`;
    }

    endTimeChange(value: Date) {
        this.campaignData.end_time = value.getTime();
    }

    addMilestone() {
        this.campaignData.milestones.push(this.newMilestone);
        this.newMilestone = '';
    }

    milestoneChange(value) {
        this.newMilestone = value;
    }

    addRequirement() {
        this.campaignData.requirements.push(this.newRequirement);
        this.newRequirement = '';
    }

    requirementChange(value) {
        this.newRequirement = value;
    }

    async createCampaign() {
        console.log(this.campaignData);
        this.extraInfo.contracts = this.uploadedContract;
        this.extraInfo.type = this.campaignType;
        this.extraInfo.platform = this.platform.value;
        this.extraInfo.post_time = Math.round(this.postDate.getTime() / 86400000) * 86400000 +
            this.postTime.valueOf() % 86400000;
        this.campaignData.end_time = Math.round(this.endDate.getTime() / 86400000) * 86400000 +
        this.endTime.valueOf() % 86400000;
        this.campaignData.extra_info = JSON.stringify(this.extraInfo);

        this.loadingService.show();
        console.log(this.campaignData);
        const campaign = await this.campaignService.createCamapaign(this.campaignData);
        campaign.subscribe(result => {
            console.log(result);
            this.loadingService.hide();
            this.router.navigate(['/app/home']);
        });
    }

    async createBrandCampaign() {
        console.log(this.campaignData);

        this.extraInfo.commissionType = this.commissionType.value;
        this.extraInfo.contracts = this.uploadedContract;
        this.extraInfo.type = this.campaignType;
        this.extraInfo.platform = this.platform.value;
        this.extraInfo.post_time = Math.round(this.postDate.getTime() / 86400000) * 86400000 +
            this.postTime.valueOf() % 86400000;
        this.campaignData.end_time = Math.round(this.endDate.getTime() / 86400000) * 86400000 +
        this.endTime.valueOf() % 86400000;
        this.campaignData.extra_info = JSON.stringify(this.extraInfo);

        this.loadingService.show();
        console.log(this.campaignData);

        const campaign = await this.campaignService.createBrandCampaign(this.campaignData);
        campaign.subscribe(result => {
            console.log(result);
            this.loadingService.hide();
            this.router.navigate(['/app/home']);
        });
    }

    removeFromList(list, i) {
        list.splice(i, 1);
    }


    uploadContract() {
        this.auth.user.subscribe(user => {
            const dialogRef = this.dialog.open(UploadContractDialogComponent, {
                width: '600px',
                data: {
                    uploadPath: `contract/${user.uid}/`,
                },
            });

            dialogRef.afterClosed().subscribe(result => {
                console.log(`Dialog result: ${result}`);
                if (result && result['contract']) {
                    this.uploadedContract = result['contract'];
                }
            });
        });
    }

    removeContract(index) {
        this.uploadedContract.splice(index, 1);
    }
}
