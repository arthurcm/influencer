import {
    Component,
    EventEmitter,
    Input,
    Output,
    OnInit,
    OnDestroy,
} from '@angular/core';
import { Subscription } from 'rxjs';

export enum AlertType {
    Success = 'SUCCESS',
    Info = 'INFO',
    Warning = 'WARNING',
    Error = 'ERROR',
}

const IconMap = {
    [AlertType.Error]: 'error',
    [AlertType.Warning]: 'warning',
    [AlertType.Success]: 'check_circle',
    [AlertType.Info]: 'info',
};

const InitBottom = 50; // px
const InitRight = 50; // px

const Width = 420; // px
const Height = 80; // px

@Component({
    selector: 'in-notification',
    templateUrl: './notification.component.html',
    styleUrls: ['./notification.component.scss'],
})
export class NotificationComponent implements OnInit, OnDestroy {

    private initIndex: number;

    private isShown = false;

    @Input() index: number;

    @Output() indexEmitter = new EventEmitter();

    @Input() type: AlertType = AlertType.Info;

    @Input() duration = 5000; // millisecond

    @Input() title: string;

    @Input() message: string;

    @Output() destroy = new EventEmitter<null>();

    get bottom() {
        return `${(this.index + 1) * InitBottom + this.index * Height}px`;
    }

    get right() {
        if (this.isShown) {
            return `${InitRight}px`;
        }

        return `-${InitRight + Width}px`;
    }

    get className() {
        return `notification-container ${String(this.type).toLowerCase()}`;
    }

    get icon() {
        return IconMap[this.type];
    }

    get defaultTitle() {
        return '';
    }

    private timer;

    private subscriber = new Subscription();

    constructor(
    ) {
    }

    async ngOnInit() {
        this.initIndex = this.index;

        this.isShown = true;
        await sleep(100);

        this.timer = setTimeout(() => {
            this.close();
        }, this.duration);
    }

    ngOnDestroy() {
        clearTimeout(this.timer);
        this.subscriber.unsubscribe();
    }

    async close() {
        this.isShown = false;
        await sleep(500);

        this.destroy.emit();
    }
}

export async function sleep(duration: number) { // milliseconds
    return new Promise<void>(resolve => {
        setTimeout(() => {
            resolve();
        }, duration);
    });
}
