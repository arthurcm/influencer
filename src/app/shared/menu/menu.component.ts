import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/auth';

@Component({
    selector: 'app-menu',
    templateUrl: './menu.component.html',
    styleUrls: ['./menu.component.scss'],
})
export class MenuComponent implements OnInit {
    constructor(
        public router: Router,
        public auth: AngularFireAuth,
    ) { }

    ngOnInit(): void {

    }

    goHome() {
        this.router.navigate(['/home']);
    }

    createNew() {
        this.router.navigate(['/create-campaign']);
    }

    logout() {
        this.auth.signOut().then(result => {
            this.router.navigate(['/login']);
        });
    }
}
