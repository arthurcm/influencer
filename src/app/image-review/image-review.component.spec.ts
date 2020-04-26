import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ImageReviewComponent } from './image-review.component';

describe('ImageReviewComponent', () => {
  let component: ImageReviewComponent;
  let fixture: ComponentFixture<ImageReviewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ImageReviewComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ImageReviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
