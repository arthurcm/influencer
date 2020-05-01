import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
    selector: 'dialog-upload-image-dialog',
    templateUrl: './upload-image-dialog.component.html',
    styleUrls: ['./upload-image-dialog.component.scss'],
})
export class UploadImageDialogComponent {

    constructor(
        public dialogRef: MatDialogRef<UploadImageDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any) {
        this.uploadPath = data.uploadPath;
    }

    videoType = 'local';

    uploadPath = '';

    youtubeLink = '';

    uploadImages = [];

    caption = '';

    uploadSuccess(image) {
        this.uploadImages.push(image);
    }

    disableSave() {
        return this.uploadImages.length < 0;
    }

    saveImages() {
        this.dialogRef.close({
            images: this.uploadImages,
            caption: this.caption,
        });
    }
}
