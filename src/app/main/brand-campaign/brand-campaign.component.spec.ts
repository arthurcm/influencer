import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { BrandCampaignComponent } from './brand-campaign.component';

describe('BrandCampaignComponent', () => {
  let component: BrandCampaignComponent;
  let fixture: ComponentFixture<BrandCampaignComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ BrandCampaignComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BrandCampaignComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
