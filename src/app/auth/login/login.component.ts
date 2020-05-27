import { Component, OnInit } from '@angular/core';
import { auth } from 'firebase';
import { AngularFireAuth } from '@angular/fire/auth';
import { Router } from '@angular/router';

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {

    constructor(
        public auth: AngularFireAuth,
        public router: Router
    ) { }

    ngOnInit() {
    }

    login() {
        this.auth.signInWithPopup(new auth.GoogleAuthProvider()).then(result => {
            console.log(result);
            this.router.navigate(['/app/home']);
        });
    }


}
