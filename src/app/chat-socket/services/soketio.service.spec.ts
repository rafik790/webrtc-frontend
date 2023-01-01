import { TestBed } from '@angular/core/testing';

import { SoketioService } from './soketio.service';

describe('SoketioService', () => {
  let service: SoketioService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SoketioService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
