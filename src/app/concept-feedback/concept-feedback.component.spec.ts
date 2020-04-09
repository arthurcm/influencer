import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ConceptFeedbackComponent } from './concept-feedback.component';

describe('ConceptFeedbackComponent', () => {
    let component: ConceptFeedbackComponent;
    let fixture: ComponentFixture<ConceptFeedbackComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [ ConceptFeedbackComponent ],
        })
            .compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(ConceptFeedbackComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
