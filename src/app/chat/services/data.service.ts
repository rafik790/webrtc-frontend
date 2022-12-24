import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { Message } from '../types/message';
export const WS_ENDPOINT = 'ws://3.110.148.160/rtc';

@Injectable({
  providedIn: 'root',
})
export class DataService {
  private socket$?: WebSocketSubject<any>;
  private messagesSubject = new Subject<Message>();
  public messages$ = this.messagesSubject.asObservable();
  constructor() {}

  /**
   * Creates a new WebSocket subject and send it to the messages subject
   * @param cfg if true the observable will be retried.
   */
  public connect(): void {
    if (!this.socket$ || this.socket$.closed) {
      this.socket$ = this.getNewWebSocket();
      this.socket$.subscribe(
        // Called whenever there is a message from the server
        (msg) => {
          console.log('Received message of type: ' + msg.type);
          this.messagesSubject.next(msg);
        }
      );
    }
  }

  public sendMessage(msg: Message): void {
    console.log('sending message: ' + msg.type);
    if (this.socket$ != undefined) {
      this.socket$.next(msg);
    }
  }

  /**
   * Return a custom WebSocket subject which reconnects after failure
   */
  private getNewWebSocket(): WebSocketSubject<any> {
    return webSocket({
      url: WS_ENDPOINT,
      openObserver: {
        next: () => {
          console.log('[DataService]: connection ok');
        },
      },
      closeObserver: {
        next: () => {
          console.log('[DataService]: connection closed');
          this.socket$ = undefined;
          this.connect();
        },
      },
    });
  }
}
