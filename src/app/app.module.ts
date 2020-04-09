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

import { FormsModule } from '@angular/forms';

import { AngularFireAuthGuardModule } from '@angular/fire/auth-guard';
import { MatNativeDateModule } from '@angular/material/core';
import { AngularFireStorageModule, BUCKET } from '@angular/fire/storage';
import { CampaignComponent } from './campaign/campaign.component';
import { CreateCampaignComponent } from './create-campaign/create-campaign.component';
import { MenuComponent } from './shared/menu/menu.component';
import { ConceptFeedbackComponent } from './concept-feedback/concept-feedback.component';
import { VideoReviewComponent } from './video-review/video-review.component';
import { LoginComponent } from './login/login.component';
import { HomeComponent } from './home/home.component';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { UploadTaskComponent } from './upload-task/upload-task.component';
import { UploaderComponent } from './uploader/uploader.component';

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
        FormsModule,
        MatListModule,
        MatMenuModule,
        MatIconModule,
    ],
    exports: [
        UploaderComponent,

    ],
    providers: [
        MatDatepickerModule,
        { provide: BUCKET, useValue: 'influencer-272204.appspot.com' },
    ],
    bootstrap: [AppComponent],
})
export class AppModule { }
