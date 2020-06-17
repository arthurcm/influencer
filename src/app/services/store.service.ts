import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable()
export class UserNameService {

    private idToken = new BehaviorSubject<any>([]);

    currentReserve = this.idToken.asObservable();
  
    constructor() { }
  
    changeReserve(idToken: any[]) {
      this.idToken.next(idToken)
    }

    get currentIdToken() {
        return this.idToken.asObservable();
    }

//     get reserveSource() {
//         this.auth.idTokenResult.subscribe(idToken => {
//             if (idToken.claims && idToken.claims.store_account === true) {
//                 this.isBrandView = true;
//                 this.loadBrandCampaign();
//             } else {
//                 this.isBrandView = false;
//                 this.loadInfluencerCampaign();
//             }
//         });
//    }
}