import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { HomeComponent } from './main/home/home.component';
import { LoginComponent } from './auth/login/login.component';

import { AngularFireAuthGuard, redirectUnauthorizedTo } from '@angular/fire/auth-guard';
import { AppComponent } from './app.component';
import { CreateCampaignComponent } from './main/create-campaign/create-campaign.component';
import { CampaignComponent } from './main/campaign/campaign.component';
import { ConceptFeedbackComponent } from './concept-feedback/concept-feedback.component';
import { VideoReviewComponent } from './video-review/video-review.component';
import { VideoPlayerComponent } from './shared/video-player/video-player.component';
import { ImageReviewComponent } from './image-review/image-review.component';
import { SignUpComponent } from './auth/sign-up/sign-up.component';
import { MainComponent } from './main/main.component';

const redirectUnauthorizedToLogin = () => redirectUnauthorizedTo(['login']);

const routes: Routes = [
    {
        path: 'login',
        component: LoginComponent,
    },
    {
        path: 'sign-up',
        component: SignUpComponent,
    },
    {
        path: 'app',
        component: MainComponent,
        canActivate: [AngularFireAuthGuard],
        data: { authGuardPipe: redirectUnauthorizedToLogin },
        children: [
            {
                path: '',
                redirectTo: 'home',
                pathMatch: 'full',
            },
            {
                path: 'home',
                component: HomeComponent,
            },
            {
                path: 'create-campaign',
                component: CreateCampaignComponent,
            },
            {
                path: 'campaign/:id',
                component: CampaignComponent,
            },
            {
                path: 'concept-feedback/:campaignId/:historyId',
                component: ConceptFeedbackComponent,
            },
            {
                path: 'video-review/:campaignId/:historyId',
                component: VideoReviewComponent,
            },
            {
                path: 'image-review/:campaignId/:historyId',
                component: ImageReviewComponent,
            },
            {
                path: 'video-player',
                component: VideoPlayerComponent,
            },
        ],
    },
    { path: '',
        pathMatch: 'full',
        redirectTo: 'app',
    },
    { path: '**', component: MainComponent },
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule],
})
export class AppRoutingModule { }
