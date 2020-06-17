import { ComponentFactoryResolver, Injectable, ViewContainerRef } from '@angular/core';

import { NotificationComponent, AlertType } from '../shared/notification/notification.component';

export { AlertType } from '../shared/notification/notification.component';

@Injectable({
    providedIn: 'root',
})
export class NotificationService {
    private rootViewContainer: ViewContainerRef;

    private index = 0;

    constructor(
        private factoryResolver: ComponentFactoryResolver,
    ) {}

    setRootViewContainerRef(viewContainerRef: ViewContainerRef) {
        this.rootViewContainer = viewContainerRef;
    }

    addMessage(props: {
        type?: AlertType;
        duration?: number;
        title?: string;
        message: string;
    }) {
        const factory = this.factoryResolver.resolveComponentFactory(NotificationComponent);
        const component = factory.create(this.rootViewContainer.parentInjector);
        const componentIndex = this.index;

        [
            'type', 'duration', 'title', 'message',
        ].forEach(attr => {
            if (props[attr] !== undefined) {
                component.instance[attr] = props[attr];
            }
        });

        component.instance.index = componentIndex;

        component.instance.destroy.subscribe(() => {
            component.destroy();

            this.index -= 1;
        });

        this.rootViewContainer.insert(component.hostView);
        this.index += 1;
    }
}
