import { Component, OnInit, ViewContainerRef } from '@angular/core';
import { auth } from 'firebase';
import { AngularFireAuth } from '@angular/fire/auth';
import { Router, ActivatedRoute } from '@angular/router';
import { NotificationService, AlertType } from 'src/app/services/notification.service';

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {

    completeLoading;

    constructor(
        public auth: AngularFireAuth,
        public router: Router,
        private route: ActivatedRoute,
        private notificationService: NotificationService,
        private viewContainerRef: ViewContainerRef,
    ) { }

    ngOnInit() {

        this.notificationService.setRootViewContainerRef(this.viewContainerRef);
        // https://login.lifo.ai/login?idToken=eyJhbGciOiJSUzI1NiIsImtpZCI6Ijc0Mzg3ZGUyMDUxMWNkNDgzYTIwZDIyOGQ5OTI4ZTU0YjNlZTBlMDgiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vaW5mbHVlbmNlci0yNzIyMDQiLCJhdWQiOiJpbmZsdWVuY2VyLTI3MjIwNCIsImF1dGhfdGltZSI6MTU5MTUxNzMwMywidXNlcl9pZCI6ImxpZm8tZGV2Lm15c2hvcGlmeS5jb20iLCJzdWIiOiJsaWZvLWRldi5teXNob3BpZnkuY29tIiwiaWF0IjoxNTkxNTE3MzAzLCJleHAiOjE1OTE1MjA5MDMsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnt9LCJzaWduX2luX3Byb3ZpZGVyIjoiY3VzdG9tIn19.VxAgaBgr0yz9E0F44yg86aoGymTUsKsFUewqVx5HnHOurzUkNCRbuL7o9Qzs3O6wsKssgt2o4ypBvzkzbkx9C6YvBna9p35rEpspttqDzWsg5jDcBvT2UbD2H4EPc2aig0NE1OZQklZ01rsz_G9AEMp2sJiocLGoAmCeX4D7z-F6FEs2X9EhKsFlZpfpt33E-BKCKxrh9JVd6U3iMB9tCQZj9oNkW9LQsQQjPqgKJAdnWGPbe_zZJmXRhUXM_s9xB2Tbq9M1CuZ83VOGAbUnA0mQux-2-wLvZvp0pGo-cMYbC9oNWVoHVewsJKqI62ctWwtbCrRvzS-p5QpE5Do5_g
        this.route.queryParams.subscribe(params => {
            console.log(params);
            if (params['idToken']) {
                this.auth.signInWithCustomToken(params['idToken']).then(result => {
                    console.log(result);
                    this.auth.idTokenResult.subscribe(idToken => {
                        if (idToken.claims && idToken.claims.store_account === true) {
                            this.router.navigate(['/app/brand-home']);
                        } else {
                            this.router.navigate(['/app/home']);
                        }
                    });
                }).catch(error => {
                    this.notificationService.addMessage({
                        type: AlertType.Error,
                        title: 'Login Error',
                        message: 'Invalid token. Please verify and login again.',
                        duration: 3000,
                    });
                    this.completeLoading = true;
                });
            } else {
                this.completeLoading = true;
            }
        });
    }


    login() {
        this.auth.signInWithPopup(new auth.GoogleAuthProvider()).then(result => {
            console.log(result);
            this.router.navigate(['/app/home']);
        });
    }


}
