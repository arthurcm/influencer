import { Component, Directive, HostListener, Output, EventEmitter } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
})
export class AppComponent {
    title = 'influencer';

    constructor(public auth: AngularFireAuth) {
    }
}

@Directive({
    selector: '[dropzone]',
})
export class DropzoneDirective {
    @Output() dropped = new EventEmitter<FileList>();
    @Output() hovered = new EventEmitter<boolean>();

    @HostListener('drop', ['$event'])
    onDrop($event: { preventDefault: () => void; dataTransfer: { files: FileList } }) {
        $event.preventDefault();
        this.dropped.emit($event.dataTransfer.files);
        this.hovered.emit(false);
    }

    @HostListener('dragover', ['$event'])
    onDragOver($event) {
        $event.preventDefault();
        this.hovered.emit(true);
    }

    @HostListener('dragleave', ['$event'])
    onDragLeave($event) {
        $event.preventDefault();
        this.hovered.emit(false);
    }
}
