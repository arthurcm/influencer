import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { Router } from '@angular/router';


@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

  constructor(public auth: AngularFireAuth, public router: Router) { }

  ngOnInit() {
  }

  logout() {
    this.auth.signOut().then(result => {
      this.router.navigate(['/login']);
    });
  }

}
