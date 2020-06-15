import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AngularFireModule } from '@angular/fire';
import { environment } from 'src/environments/environment';
import { AngularFirestoreModule } from '@angular/fire/firestore';
import { AngularFireAuthModule } from '@angular/fire/auth';
import { AngularFireFunctionsModule } from '@angular/fire/functions';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatStepperModule } from '@angular/material/stepper';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatSelectModule } from '@angular/material/select';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatRadioModule } from '@angular/material/radio';
import { MatSidenavModule } from '@angular/material/sidenav';
import { PerfectScrollbarModule } from 'ngx-perfect-scrollbar';
import { PERFECT_SCROLLBAR_CONFIG } from 'ngx-perfect-scrollbar';
import { PerfectScrollbarConfigInterface } from 'ngx-perfect-scrollbar';
import { NgSelectModule } from '@ng-select/ng-select';

import { NgxMatDatetimePickerModule, NgxMatTimepickerModule, NgxMatNativeDateModule } from '@angular-material-components/datetime-picker';
import { NgxMatMomentModule } from '@angular-material-components/moment-adapter';

import { FormsModule } from '@angular/forms';
import { NguCarouselModule } from '@ngu/carousel';

import { VgCoreModule } from 'ngx-videogular';
import { VgControlsModule } from 'ngx-videogular';
import { VgOverlayPlayModule } from 'ngx-videogular';
import { VgBufferingModule } from 'ngx-videogular';
import { VgStreamingModule } from 'ngx-videogular';

import { AngularFireAuthGuardModule } from '@angular/fire/auth-guard';
import { MatNativeDateModule } from '@angular/material/core';
import { AngularFireStorageModule, BUCKET } from '@angular/fire/storage';
import { CampaignComponent } from './main/campaign/campaign.component';
import { CreateCampaignComponent } from './main/create-campaign/create-campaign.component';
import { MenuComponent } from './shared/menu/menu.component';
import { ConceptFeedbackComponent } from './concept-feedback/concept-feedback.component';
import { VideoReviewComponent } from './video-review/video-review.component';
import { LoginComponent } from './auth/login/login.component';
import { HomeComponent } from './main/home/home.component';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { UploadTaskComponent } from './upload-task/upload-task.component';
import { UploaderComponent } from './uploader/uploader.component';
import { VideoPlayerComponent } from './shared/video-player/video-player.component';
import { HttpClientModule } from '@angular/common/http';
import { LoadingSpinnerComponent } from './shared/loading-spinner/loading-spinner.component';
import { UploadVideoDialogComponent } from './main/campaign/upload-video-dialog/upload-video-dialog.component';
import { UploadImageDialogComponent } from './main/campaign/upload-image-dialog/upload-image-dialog.component';
import { SendMessageDialogComponent } from './main/campaign/send-message-dialog/send-message-dialog.component';
import { ImageReviewComponent } from './image-review/image-review.component';
import { UploadContractDialogComponent } from './main/create-campaign/upload-contract-dialog/upload-contract-dialog.component';
import { MediaThreadComponent } from './media-thread/media-thread.component';
import { SignUpComponent } from './auth/sign-up/sign-up.component';
import { MainComponent } from './main/main.component';
import { CampaignCardComponent } from './main/campaign-card/campaign-card.component';
import { EventCalendarComponent } from './main/event-calendar/event-calendar.component';
import { CalendarModule, DateAdapter } from 'angular-calendar';
import { adapterFactory } from 'angular-calendar/date-adapters/moment';
import * as moment from 'moment';
import { CampaignOverviewComponent } from './main/campaign-overview/campaign-overview.component';
import { BrandCampaignComponent } from './main/brand-campaign/brand-campaign.component';
import { SimpleCampaignOverviewComponent } from './main/simple-campaign-overview/simple-campaign-overview.component';
import { BrandHomeComponent } from './main/brand-home/brand-home.component';

export function momentAdapterFactory() {
    return adapterFactory(moment);
}

const DEFAULT_PERFECT_SCROLLBAR_CONFIG: PerfectScrollbarConfigInterface = {
    suppressScrollX: true
};

@NgModule({
    declarations: [
        AppComponent,
        HomeComponent,
        LoginComponent,
        CampaignComponent,
        CreateCampaignComponent,
        MenuComponent,
        ConceptFeedbackComponent,
        VideoReviewComponent,
        UploadTaskComponent,
        UploaderComponent,
        VideoPlayerComponent,
        LoadingSpinnerComponent,
        UploadVideoDialogComponent,
        UploadImageDialogComponent,
        SendMessageDialogComponent,
        UploadContractDialogComponent,
        ImageReviewComponent,
        MediaThreadComponent,
        SignUpComponent,
        MainComponent,
        CampaignCardComponent,
        EventCalendarComponent,
        CampaignOverviewComponent,
        BrandCampaignComponent,
        SimpleCampaignOverviewComponent,
        BrandHomeComponent,
    ],
    imports: [
        BrowserModule,
        AppRoutingModule,
        AngularFireModule.initializeApp(environment.firebase),
        AngularFireAuthModule,
        AngularFireAuthGuardModule,
        AngularFirestoreModule,
        AngularFireFunctionsModule,
        AngularFireStorageModule,
        BrowserAnimationsModule,
        MatButtonModule,
        MatInputModule,
        MatFormFieldModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatExpansionModule,
        MatCardModule,
        MatDividerModule,
        MatCheckboxModule,
        MatStepperModule,
        MatGridListModule,
        MatSortModule,
        FormsModule,
        MatListModule,
        MatMenuModule,
        MatIconModule,
        MatTableModule,
        MatSelectModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatRadioModule,
        MatSidenavModule,
        VgCoreModule,
        VgControlsModule,
        VgOverlayPlayModule,
        VgBufferingModule,
        VgStreamingModule,
        HttpClientModule,
        NgxMatDatetimePickerModule,
        NgxMatTimepickerModule,
        NgxMatNativeDateModule,
        NgxMatMomentModule,
        CalendarModule.forRoot({ provide: DateAdapter, useFactory: momentAdapterFactory }),
        PerfectScrollbarModule,
        NgSelectModule,
        NguCarouselModule,
    ],
    exports: [
        UploaderComponent,

    ],
    entryComponents: [
        LoadingSpinnerComponent,
        UploadVideoDialogComponent,
        UploadImageDialogComponent,
        SendMessageDialogComponent,
        UploadContractDialogComponent,
    ],
    providers: [
        MatDatepickerModule,
        { provide: BUCKET, useValue: 'influencer-272204.appspot.com' },
        {
            provide: PERFECT_SCROLLBAR_CONFIG,
            useValue: DEFAULT_PERFECT_SCROLLBAR_CONFIG
        }
    ],
    bootstrap: [AppComponent],
})
export class AppModule { }
