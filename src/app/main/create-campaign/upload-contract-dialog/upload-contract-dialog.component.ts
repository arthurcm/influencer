import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
    selector: 'dialog-upload-contract-dialog',
    templateUrl: './upload-contract-dialog.component.html',
    styleUrls: ['./upload-contract-dialog.component.scss'],
})
export class UploadContractDialogComponent {

    constructor(
        public dialogRef: MatDialogRef<UploadContractDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any) {
        this.uploadPath = data.uploadPath;
    }

    uploadPath = '';

    uploadContract = [];

    caption = '';

    uploadSuccess(contract) {
        this.uploadContract.push(contract);
    }

    disableSave() {
        return this.uploadContract.length < 0;
    }

    saveImages() {
        this.dialogRef.close({
            contract: this.uploadContract,
        });
    }
}
