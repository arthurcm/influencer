import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/auth';

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
    ) { }

    ngOnInit(): void {
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
