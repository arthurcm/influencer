import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { AngularFireFunctions } from '@angular/fire/functions';


@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

  campaigns: [];

  constructor(
    public auth: AngularFireAuth, 
    public router: Router,
    private fns: AngularFireFunctions,
  ) { 

    const callable = this.fns.httpsCallable('getCampaign');
    callable({ campaignId: '123' }).subscribe(result => {
      console.log(result);
    });
  }

  ngOnInit() {
    
  }

  logout() {
    this.auth.signOut().then(result => {
      this.router.navigate(['/login']);
    });
  }

}
