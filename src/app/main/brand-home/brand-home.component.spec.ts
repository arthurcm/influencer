import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { BrandHomeComponent } from './brand-home.component';

describe('BrandHomeComponent', () => {
  let component: BrandHomeComponent;
  let fixture: ComponentFixture<BrandHomeComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ BrandHomeComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BrandHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
