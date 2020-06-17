import { Component, OnInit, ViewContainerRef } from '@angular/core';
import { Router } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/auth';
import { NotificationService } from '../services/notification.service';

@Component({
    selector: 'app-main',
    templateUrl: './main.component.html',
    styleUrls: ['./main.component.scss'],
})
export class MainComponent implements OnInit {

    isBrandView: boolean;

    constructor(
        public router: Router,
        public auth: AngularFireAuth,
        private viewContainerRef: ViewContainerRef,
        private notificationService: NotificationService,
    ) { }

    ngOnInit(): void {
        this.notificationService.setRootViewContainerRef(this.viewContainerRef);

        this.auth.idTokenResult.subscribe(idToken => {
            if (idToken.claims && idToken.claims.store_account === true) {
                this.isBrandView = true;
            } else {
                this.isBrandView = false;
            }
        });
    }

    navigate(page) {
        this.router.navigate([`/app/${page}`]);
    }

    logout() {
        this.auth.signOut().then(result => {
            this.router.navigate(['/login']);
        });
    }

}
