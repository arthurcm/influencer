import { Injectable } from '@angular/core';
import { HttpHeaders, HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { VideoMetaData, Campaign, CampaignDetail } from 'src/types/campaign';
import { AngularFireAuth } from '@angular/fire/auth';
import { catchError } from 'rxjs/operators';
import { Thread } from 'src/types/thread';

@Injectable({
    providedIn: 'root',
})
export class CampaignService {
    CAMPAIGN_SERVICE_URL = 'https://api-nodejs-4lladlc2eq-uc.a.run.app';

    constructor(
        private http: HttpClient,
        public auth: AngularFireAuth,
    ) {}

    async getAllCampaignForUser() {
        const token = await (await this.auth.currentUser).getIdToken();

        const httpOptions = {
            headers: new HttpHeaders({
                Authorization: `${token}`,
                'Content-Type':  'application/json',
            }),
        };
        const reqeustUrl = `${this.CAMPAIGN_SERVICE_URL}/get_campaign`;
        return this.http.get<Campaign[]>(reqeustUrl, httpOptions).pipe(
            catchError(this.handleError)
        );
    }

    async getCampaignById(campaignId) {
        const token = await (await this.auth.currentUser).getIdToken();

        const httpOptions = {
            headers: new HttpHeaders({
                Authorization: `${token}`,
                'Content-Type':  'application/json',
            }),
        };
        const reqeustUrl = `${this.CAMPAIGN_SERVICE_URL}/common/campaign/campaign_id/${campaignId}`;
        return this.http.get<any>(reqeustUrl, httpOptions).pipe(
            catchError(this.handleError)
        );
    }

    async getCampaignByIdInfluencer(campaignId) {
        const token = await (await this.auth.currentUser).getIdToken();

        const httpOptions = {
            headers: new HttpHeaders({
                Authorization: `${token}`,
                'Content-Type':  'application/json',
            }),
        };
        const reqeustUrl = `${this.CAMPAIGN_SERVICE_URL}/get_campaign/campaign_id/${campaignId}`;
        return this.http.get<any>(reqeustUrl, httpOptions).pipe(
            catchError(this.handleError)
        );
    }

    async getBrandCampaignById(brandCampaignId) {
        const token = await (await this.auth.currentUser).getIdToken();

        const httpOptions = {
            headers: new HttpHeaders({
                Authorization: `${token}`,
                'Content-Type':  'application/json',
            }),
        };
        const reqeustUrl = `${this.CAMPAIGN_SERVICE_URL}/common/campaign/brand_campaign_id/${brandCampaignId}`;
        return this.http.get<any>(reqeustUrl, httpOptions).pipe(
            catchError(this.handleError)
        );
    }

    async createCamapaign(campaign) {
        const token = await (await this.auth.currentUser).getIdToken();

        const httpOptions = {
            headers: new HttpHeaders({
                Authorization: `${token}`,
                'Content-Type':  'application/json',
            }),
        };
        const reqeustUrl = `${this.CAMPAIGN_SERVICE_URL}/create_campaign`;
        return this.http.post<any>(reqeustUrl, campaign, httpOptions).pipe(
            catchError(this.handleError)
        );
    }

    async updateCampaignById(campaign, campaignId) {
        const token = await (await this.auth.currentUser).getIdToken();

        const httpOptions = {
            headers: new HttpHeaders({
                Authorization: `${token}`,
                'Content-Type':  'application/json',
            }),
        };
        const reqeustUrl = `${this.CAMPAIGN_SERVICE_URL}/update_campaign/campaign_id/${campaignId}`;
        return this.http.put<any>(reqeustUrl, campaign, httpOptions).pipe(
            catchError(this.handleError)
        );
    }

    async deleteCampaignById(campaignId) {
        const token = await (await this.auth.currentUser).getIdToken();

        const httpOptions = {
            headers: new HttpHeaders({
                Authorization: `${token}`,
                'Content-Type':  'application/json',
            }),
        };
        const reqeustUrl = `${this.CAMPAIGN_SERVICE_URL}/delete_campaign/campaign_id/${campaignId}`;
        return this.http.delete<any>(reqeustUrl, httpOptions).pipe(
            catchError(this.handleError)
        );
    }

    async completeCampaign(campaign) {
        const token = await (await this.auth.currentUser).getIdToken();

        const httpOptions = {
            headers: new HttpHeaders({
                Authorization: `${token}`,
                'Content-Type':  'application/json',
            }),
        };
        const reqeustUrl = `${this.CAMPAIGN_SERVICE_URL}/complete_campaign/campaign_id/${campaign.campaign_id}`;
        return this.http.put<any>(reqeustUrl, campaign, httpOptions).pipe(
            catchError(this.handleError)
        );
    }

    async signupCampaign(campaign: CampaignDetail) {
        const token = await (await this.auth.currentUser).getIdToken();

        const httpOptions = {
            headers: new HttpHeaders({
                Authorization: `${token}`,
                'Content-Type':  'application/json',
            }),
        };
        const reqeustUrl = `${this.CAMPAIGN_SERVICE_URL}/sign_up_campaign/brand_campaign_id/${campaign.brand_campaign_id}`;
        return this.http.put<any>(reqeustUrl, campaign, httpOptions).pipe(
            catchError(this.handleError)
        );
    }

    async provideFeedback(content, campaignId, historyId) {
        const token = await (await this.auth.currentUser).getIdToken();

        const httpOptions = {
            headers: new HttpHeaders({
                Authorization: `${token}`,
                'Content-Type':  'application/json',
            }),
        };
        const reqeustUrl = `${this.CAMPAIGN_SERVICE_URL}/feedback/campaign_id/${campaignId}/history_id/${historyId}`;
        return this.http.put<any>(reqeustUrl, content, httpOptions).pipe(
            catchError(this.handleError)
        );
    }

    async getAllBrandCamapignInf() {
        const token = await (await this.auth.currentUser).getIdToken();

        const httpOptions = {
            headers: new HttpHeaders({
                Authorization: `${token}`,
                'Content-Type':  'application/json',
            }),
        };
        const reqeustUrl = `${this.CAMPAIGN_SERVICE_URL}/list_brand_campaigns_inf`;
        return this.http.get<CampaignDetail[]>(reqeustUrl, httpOptions).pipe(
            catchError(this.handleError)
        );
    }

    async createBrandCampaign(campaign) {
        const token = await (await this.auth.currentUser).getIdToken();

        const httpOptions = {
            headers: new HttpHeaders({
                Authorization: `${token}`,
                'Content-Type':  'application/json',
            }),
        };
        const reqeustUrl = `${this.CAMPAIGN_SERVICE_URL}/brand/campaign`;
        return this.http.post<any>(reqeustUrl, campaign, httpOptions).pipe(
            catchError(this.handleError)
        );
    }

    async getBrandCampaign() {
        const token = await (await this.auth.currentUser).getIdToken();

        const httpOptions = {
            headers: new HttpHeaders({
                Authorization: `${token}`,
                'Content-Type':  'application/json',
            }),
        };
        const reqeustUrl = `${this.CAMPAIGN_SERVICE_URL}/brand/campaign`;
        return this.http.get<CampaignDetail[]>(reqeustUrl, httpOptions).pipe(
            catchError(this.handleError)
        );
    }

    async getCommissionType() {
        const token = await (await this.auth.currentUser).getIdToken();

        const httpOptions = {
            headers: new HttpHeaders({
                Authorization: `${token}`,
                'Content-Type':  'application/json',
            }),
        };
        const reqeustUrl = `${this.CAMPAIGN_SERVICE_URL}/brand/get_brand_campaign_types`;
        return this.http.get<Campaign[]>(reqeustUrl, httpOptions).pipe(
            catchError(this.handleError)
        );
    }

    async getInfluencerProfile(uid) {
        const token = await (await this.auth.currentUser).getIdToken();

        const httpOptions = {
            headers: new HttpHeaders({
                Authorization: `${token}`,
                'Content-Type':  'application/json',
            }),
        };
        const reqeustUrl = `${this.CAMPAIGN_SERVICE_URL}/common/influencer_profile/uid/${uid}`;
        return this.http.get<any>(reqeustUrl, httpOptions).pipe(
            catchError(this.handleError)
        );
    }

    shareContent(toEmail: string, fromEmail: string, url: string) {
        const request = {
            to_email: toEmail,
            email: fromEmail,
            url,
        };
        const httpOptions = {
            headers: new HttpHeaders({
                'Content-Type':  'application/json',
            }),
        };
        const reqeustUrl = 'https://api-general-4lladlc2eq-uc.a.run.app/share';
        return this.http.post<any>(reqeustUrl, request, httpOptions);
    }

    getImageMetaData(imageUrl: string) {
        const url = `http://video-transcoder-k8s.default.35.193.22.35.xip.io/get_image_meta/name/${encodeURIComponent(imageUrl)}`;

        const httpOptions = {
            headers: new HttpHeaders({
                'Content-Type':  'application/json',
            }),
        };

        return this.http.get<any>(url, httpOptions);
    }

    getVideoMetaData(videoUrl: string, videoType: string = 'video/mp4'): Observable<any> {
        const data = {
            name: videoUrl,
            contentType: 'video/mp4',
        };

        const url = `http://video-transcoder-k8s.default.35.193.22.35.xip.io/get_video_meta/name/${encodeURIComponent(videoUrl)}`;

        const httpParms = new HttpParams().set('name', encodeURIComponent(videoUrl)).set('contentType', encodeURIComponent('video/mp4'));
        const httpOptions = {
            headers: new HttpHeaders({
                'Content-Type':  'application/json',
            }),
            // params: httpParms,
        };
        console.log(data);

        return this.http.get<any>(url, httpOptions).pipe(
            catchError(this.handleError)
        );
    }

    transcodeVideo(videoUrl: string, videoType: string = 'video/mp4'): Observable<VideoMetaData> {
        const data = {
            name: videoUrl,
            contentType: videoType,
        };
        const url = 'http://video-transcoder-k8s.default.35.193.22.35.xip.io/transcode_gcs';
        const httpOptions = {
            headers: new HttpHeaders({
                'Content-Type':  'application/json',
            }),
        };
        return this.http.post<any>(url, data, httpOptions);
    }

    private handleError(error: HttpErrorResponse) {
        if (error.error instanceof ErrorEvent) {
            // A client-side or network error occurred. Handle it accordingly.
            console.error('An error occurred:', error.error.message);
        } else {
            // The backend returned an unsuccessful response code.
            // The response body may contain clues as to what went wrong,
            console.error(
                `Backend returned code ${error.status}, ` +
            `body was: ${error.error}`);
        }
        // return an observable with a user-facing error message
        return throwError(
            'Something bad happened; please try again later.');
    };

    async getAllMediaForCampaign(type: string, campaignId: string) {
        const token = await (await this.auth.currentUser).getIdToken();

        const httpOptions = {
            headers: new HttpHeaders({
                Authorization: `${token}`,
                'Content-Type':  'application/json',
            }),
        };
        const reqeustUrl = `${this.CAMPAIGN_SERVICE_URL}/common/media/campaign_type/${type}/campaign_id/${campaignId}}`;
        return this.http.get<any>(reqeustUrl, httpOptions).pipe(
            catchError(this.handleError)
        );
    }

    async getThread(path: string) {
        const token = await (await this.auth.currentUser).getIdToken();

        const httpOptions = {
            headers: new HttpHeaders({
                Authorization: `${token}`,
                'Content-Type':  'application/json',
            }),
        };
        const reqeustUrl = `${this.CAMPAIGN_SERVICE_URL}/share/get_threads/media_object_path/${encodeURIComponent(path)}`;
        return this.http.get<Thread[]>(reqeustUrl, httpOptions).pipe(
            catchError(this.handleError)
        );
    }

    async createThread(path: string, feedback: string) {
        const request = {
            media_object_path: path,
            feedback_str: feedback,
        };
        const token = await (await this.auth.currentUser).getIdToken();

        const httpOptions = {
            headers: new HttpHeaders({
                Authorization: `${token}`,
                'Content-Type':  'application/json',
            }),
        };
        const reqeustUrl = `${this.CAMPAIGN_SERVICE_URL}/share/create_feedback_thread`;
        return this.http.post<any>(reqeustUrl, request, httpOptions).pipe(
            catchError(this.handleError)
        );
    }

    async replyThread(path: string, feedback: string, threadId: string) {
        const request = {
            media_object_path: path,
            feedback_str: feedback,
            thread_id: threadId,
        };
        const token = await (await this.auth.currentUser).getIdToken();
        const httpOptions = {
            headers: new HttpHeaders({
                Authorization: `${token}`,
                'Content-Type':  'application/json',
            }),
        };
        const reqeustUrl = `${this.CAMPAIGN_SERVICE_URL}/share/reply_feedback_thread`;
        return this.http.post<any>(reqeustUrl, request, httpOptions).pipe(
            catchError(this.handleError)
        );

    }

    deleteThread(path: string, threadId: string) {
        const httpOptions = {
            headers: new HttpHeaders({
                'Content-Type':  'application/json',
            }),
        };
        const reqeustUrl = `${this.CAMPAIGN_SERVICE_URL}/share/delete_thread/media_object_path/${path}/thread_id/${threadId}`;
        return this.http.delete<any>(reqeustUrl, httpOptions);
    }
}
