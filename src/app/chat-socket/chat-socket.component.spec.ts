import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatSocketComponent } from './chat-socket.component';

describe('ChatSocketComponent', () => {
  let component: ChatSocketComponent;
  let fixture: ComponentFixture<ChatSocketComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ChatSocketComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChatSocketComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
