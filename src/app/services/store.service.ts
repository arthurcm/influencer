import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable()
export class UserNameService {

    private reserveSource = new BehaviorSubject<any[]>([]);

    constructor() {}

    get reserveSource() {
        this.auth.idTokenResult.subscribe(idToken => {
            if (idToken.claims && idToken.claims.store_account === true) {
                this.isBrandView = true;
                this.loadBrandCampaign();
            } else {
                this.isBrandView = false;
                this.loadInfluencerCampaign();
            }
        });
        return this.reserveSource.asObservable();
   }
}