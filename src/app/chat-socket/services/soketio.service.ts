import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { io } from 'socket.io-client';
import { Subject } from 'rxjs';
import { Message } from 'src/app/chat/types/message';

@Injectable({
  providedIn: 'root',
})
export class SoketioService {
  private messagesSubject = new Subject<Message>();
  public messages$ = this.messagesSubject.asObservable();
  socket: any;
  constructor() {}
  public setupSocketConnection() {
    this.socket = io(environment.SOCKET_ENDPOINT);
    this.socket.on('message', (data: Message) => {
      //console.log("Received Message::",data);
      this.messagesSubject.next(data);
    });
  }

  public sendMessage(msg: Message): void {
    console.log('sending message: ' + msg.type);
    if (this.socket) {
      this.socket.emit('message', msg);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}
