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
export class BrandService {

    CAMPAIGN_SERVICE_URL = 'https://api-nodejs-4lladlc2eq-uc.a.run.app';
    BRAND_SERVICE_URL = 'https://api-general-4lladlc2eq-uc.a.run.app';

    constructor(
        private http: HttpClient,
        public auth: AngularFireAuth,
    ) {}


    async getBrandROI() {
        const token = await (await this.auth.currentUser).getIdToken();

        const httpOptions = {
            headers: new HttpHeaders({
                Authorization: `${token}`,
                'Content-Type':  'application/json',
            }),
        };
        const reqeustUrl = `${this.BRAND_SERVICE_URL}/brand/roi`;
        return this.http.get<any>(reqeustUrl, httpOptions).pipe(
            catchError(this.handleError)
        );
    }

    async getBrandTrack() {
        const token = await (await this.auth.currentUser).getIdToken();

        const httpOptions = {
            headers: new HttpHeaders({
                Authorization: `${token}`,
                'Content-Type':  'application/json',
            }),
        };
        const reqeustUrl = `${this.BRAND_SERVICE_URL}/brand/track`;
        return this.http.get<any>(reqeustUrl, httpOptions).pipe(
            catchError(this.handleError)
        );
    }

    async getBrandInfluencer() {
        const token = await (await this.auth.currentUser).getIdToken();

        const httpOptions = {
            headers: new HttpHeaders({
                Authorization: `${token}`,
                'Content-Type':  'application/json',
            }),
        };
        const reqeustUrl = `${this.CAMPAIGN_SERVICE_URL}/brand/influencers`;
        return this.http.get<any>(reqeustUrl, httpOptions).pipe(
            catchError(this.handleError)
        );
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
}