import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
    selector: 'app-confirm-dialog',
    templateUrl: './confirm-dialog.html',
    styleUrls: ['./confirm-dialog.scss']
})
export class ConfirmDialogComponent implements OnInit {

    title: string;
    content: string;

    constructor(
        public dialogRef: MatDialogRef<ConfirmDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data
    ) {
        this.title = data['title'];
        this.content = data['content'];
    }

    ngOnInit() {
    }

    onNoClick(): void {
        this.dialogRef.close();
    }

    submit() {
        this.dialogRef.close(true);
    }
}
