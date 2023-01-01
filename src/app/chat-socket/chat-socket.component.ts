import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { environment } from 'src/environments/environment';
import { SoketioService } from './services/soketio.service';
const mediaConstraints = {
  audio: true,
  video: { width: 1280, height: 720 },
};

const offerOptions = {
  offerToReceiveAudio: true,
  offerToReceiveVideo: true,
};

const ENV_RTCPeerConfiguration = environment.RTCPeerConfiguration;
@Component({
  selector: 'app-chat-socket',
  templateUrl: './chat-socket.component.html',
  styleUrls: ['./chat-socket.component.css'],
})
export class ChatSocketComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('local_video') localVideo!: ElementRef;
  @ViewChild('received_video') remoteVideo!: ElementRef;
  private localStream!: MediaStream;
  private peerConnection!: RTCPeerConnection;
  inCall = false;
  localVideoActive = false;
  socketConnected = false;
  constructor(private socket: SoketioService) {}
  ngAfterViewInit(): void {}

  ngOnInit(): void {}
  ngOnDestroy() {
    this.socket.disconnect();
  }

  connect() {
    this.socket.setupSocketConnection();
    this.socketConnected = true;
    this.requestMediaDevices();

    this.socket.messages$.subscribe(
      (msg: any) => {
        console.log('Received message: ', msg);
        switch (msg.type) {
          case 'offer':
            this.handleOfferMessage(msg.data);
            break;
          case 'answer':
            //this.handleOfferMessage(msg.data);
            break;
          case 'hangup':
            //this.handleHangupMessage(msg);
            break;
          case 'ice-candidate':
            //this.handleICECandidateMessage(msg.data);
            break;
          default:
            console.log('unknown message of type ' + msg.type);
        }
      },
      (error: any) => console.log(error)
    );
  }

  private handleOfferMessage(msg: RTCSessionDescriptionInit) {
    if (!this.peerConnection) {
      this.createPeerConnection();
    }

    if (!this.localStream) {
      this.startLocalVideo();
    }
    this.peerConnection.setRemoteDescription(new RTCSessionDescription(msg));
    this.peerConnection.createAnswer();
  }

  async call(): Promise<void> {
    this.createPeerConnection();
    // Add the tracks from the local stream to the RTCPeerConnection
    this.localStream
      .getTracks()
      .forEach((track) =>
        this.peerConnection.addTrack(track, this.localStream)
      );
    try {
      const offer: RTCSessionDescriptionInit =
        await this.peerConnection.createOffer(offerOptions);
      // Establish the offer as the local peer's current description.
      await this.peerConnection.setLocalDescription(offer);
      this.inCall = true;
      this.socket.sendMessage({ type: 'offer', data: offer });
    } catch (err: any) {
      console.log('Error', err);
    }
  }

  private async requestMediaDevices(): Promise<void> {
    try {
      this.localStream = await window.navigator.mediaDevices.getUserMedia(
        mediaConstraints
      );
      // pause all tracks
      this.pauseLocalVideo();
    } catch (e: any) {
      console.error(e);
      alert(`getUserMedia() error: ${e.message}`);
    }
  }

  pauseLocalVideo(): void {
    console.log('pause local stream');
    this.localStream.getTracks().forEach((track) => {
      track.enabled = false;
    });
    this.localVideo.nativeElement.srcObject = undefined;
    this.localVideoActive = false;
  }

  startLocalVideo(): void {
    console.log('starting local stream');
    this.localStream.getTracks().forEach((track) => {
      track.enabled = true;
    });
    this.localVideo.nativeElement.srcObject = this.localStream;
    this.localVideoActive = true;
  }

  sendMessage() {
    this.socket.sendMessage({ type: 'offer', data: 'Offer' });
  }

  private createPeerConnection(): void {
    this.peerConnection = new RTCPeerConnection(ENV_RTCPeerConfiguration);
    this.peerConnection.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
      console.log('onicecandidate::', event);
      if (event.candidate) {
        this.socket.sendMessage({
          type: 'ice-candidate',
          data: event.candidate,
        });
      }
    };
  }
}
