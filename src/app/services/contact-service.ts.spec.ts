import { TestBed } from '@angular/core/testing';

import { ContactServiceTs } from './contact-service.ts';

describe('ContactServiceTs', () => {
  let service: ContactServiceTs;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ContactServiceTs);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
