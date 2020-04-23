import { Component, OnInit, Input, ChangeDetectorRef, Output, EventEmitter } from '@angular/core';
import { AngularFireStorage, AngularFireUploadTask } from '@angular/fire/storage';
import { AngularFirestore } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { finalize, tap } from 'rxjs/operators';
import { AngularFireAuth } from '@angular/fire/auth';
import { User } from 'firebase';
import { CampaignDetail } from 'src/types/campaign';

@Component({
    selector: 'upload-task',
    templateUrl: './upload-task.component.html',
    styleUrls: ['./upload-task.component.scss'],
})
export class UploadTaskComponent implements OnInit {

    @Input() file: File;
    @Input() uploadPath: string;
    @Input() campaign: CampaignDetail;
    @Output() onUploadSuccess = new EventEmitter<string>();

    task: AngularFireUploadTask;

    percentage: Observable<number>;
    snapshot: Observable<any>;
    downloadURL;

    constructor(
        private storage: AngularFireStorage,
        private db: AngularFirestore,
        public auth: AngularFireAuth,
    ) { }

    ngOnInit() {
        this.startUpload();
    }

    startUpload() {
        this.auth.user.subscribe(result => {
            // The storage path
            // NOTE: need a way to get auth so that we can tie the video's path to authentication
            const path = `${this.uploadPath}${Date.now()}`;
            console.log(path);

            // Reference to storage bucket
            const ref = this.storage.ref(path);

            // The main task
            this.task = this.storage.upload(path, this.file);

            // Progress monitoring
            this.percentage = this.task.percentageChanges();

            this.snapshot   = this.task.snapshotChanges().pipe(
                tap(console.log),
                // The file's download URL
                finalize( async () =>  {
                    this.downloadURL = await ref.getDownloadURL().toPromise();
                    console.log(this.downloadURL);
                    this.onUploadSuccess.emit(this.downloadURL);
                    // Note: here we need to get campaign information so that we can upload the
                    // contents or add campaign information to content meta data
                    // this.db.collection('video').add( { downloadURL: this.downloadURL, path });
                }),
            );
        });
    }

    isActive(snapshot) {
        return snapshot.state === 'running' && snapshot.bytesTransferred < snapshot.totalBytes;
    }

}
