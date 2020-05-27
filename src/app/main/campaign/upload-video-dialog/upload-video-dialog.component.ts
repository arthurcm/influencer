import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
    selector: 'dialog-upload-video-dialog',
    templateUrl: './upload-video-dialog.component.html',
    styleUrls: ['./upload-video-dialog.component.scss'],
})
export class UploadVideoDialogComponent {

    constructor(
        public dialogRef: MatDialogRef<UploadVideoDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any) {
        this.uploadPath = data.uploadPath;
    }

    videoType = 'local';

    uploadPath = '';

    youtubeLink = '';

    uploadedFile = {};

    uploadSuccess(video) {
        this.uploadedFile = video;
    }


    disableSave() {
        return (this.videoType === 'local' && this.uploadedFile['url'] === undefined)
            || (this.videoType === 'youtube' && this.youtubeLink === '');
    }

    saveVideo() {
        if (this.videoType === 'local') {
            this.dialogRef.close({
                type: 'local',
                file: this.uploadedFile,
            });
        }
        if (this.videoType === 'youtube') {
            this.dialogRef.close({
                type: 'youtube',
                link: this.youtubeLink,
            });
        }

    }
}
