import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
    selector: 'dialog-send-message-dialog',
    templateUrl: './send-message-dialog.component.html',
    styleUrls: ['./send-message-dialog.component.scss'],
})
export class SendMessageDialogComponent {

    constructor(
        public dialogRef: MatDialogRef<SendMessageDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any) {

    }

    message = '';
    receiver = '';
    useDefaultMessage = true;

    sendMessage() {
        this.dialogRef.close({
            message: this.message,
            receiver: this.receiver,
        });
    }
}
