import { Injectable } from '@angular/core';
import { HttpHeaders, HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { VideoMetaData } from 'src/types/campaign';

@Injectable({
    providedIn: 'root',
})
export class CampaignService {

    constructor(
        private http: HttpClient,
    ) {}

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

        return this.http.get<any>(url, httpOptions);
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
}
