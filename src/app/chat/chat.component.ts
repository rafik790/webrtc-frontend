import {
  AfterViewInit,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
} from '@angular/core';
import { environment } from 'src/environments/environment';
import { DataService } from './services/data.service';
import { Message } from './types/message';

export const ENV_RTCPeerConfiguration = environment.RTCPeerConfiguration;
const mediaConstraints = {
  audio: true,
  video: { width: 1280, height: 720 },
};

const offerOptions = {
  offerToReceiveAudio: true,
  offerToReceiveVideo: true,
};

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css'],
})
export class ChatComponent implements AfterViewInit {
  @ViewChild('local_video') localVideo!: ElementRef;
  @ViewChild('received_video') remoteVideo!: ElementRef;
  private localStream!: MediaStream;
  private peerConnection!: RTCPeerConnection;

  inCall = false;
  localVideoActive = false;

  constructor(private dataService: DataService) {}
  ngAfterViewInit(): void {
    this.addIncominMessageHandler();
    this.requestMediaDevices();
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

  private addIncominMessageHandler() {
    this.dataService.connect();
    this.dataService.messages$.subscribe(
      (msg) => {
        console.log('Received message: ' + msg.type);
        switch (msg.type) {
          case 'offer':
            this.handleOfferMessage(msg.data);
            break;
          case 'answer':
            this.handleOfferMessage(msg.data);
            break;
          case 'hangup':
            this.handleHangupMessage(msg);
            break;
          case 'ice-candidate':
            this.handleICECandidateMessage(msg.data);
            break;
          default:
            console.log('unknown message of type ' + msg.type);
        }
      },
      (error) => console.log(error)
    );
  }

  /* ########################  MESSAGE HANDLER  ################################## */
  private handleOfferMessage(msg: RTCSessionDescriptionInit) {
    console.log('handle incoming offer');
    if (!this.peerConnection) {
      this.createPeerConnection();
    }

    if (!this.localStream) {
      this.startLocalVideo();
    }

    this.peerConnection
      .setRemoteDescription(new RTCSessionDescription(msg))
      .then(() => {
        this.localVideo.nativeElement.srcObject = this.localStream;
        this.localStream
          .getTracks()
          .forEach((track) =>
            this.peerConnection.addTrack(track, this.localStream)
          );
      })
      .then(() => {
        // Build SDP for answer message
        return this.peerConnection.createAnswer();
      })
      .then((answer) => {
        // Set local SDP
        return this.peerConnection.setLocalDescription(answer);
      })
      .then(() => {
        // Send local SDP to remote party
        this.dataService.sendMessage({
          type: 'answer',
          data: this.peerConnection.localDescription,
        });

        this.inCall = true;
      })
      .catch(this.handleGetUserMediaError);
  }

  private handleGetUserMediaError(e: Error): void {
    switch (e.name) {
      case 'NotFoundError':
        alert(
          'Unable to open your call because no camera and/or microphone were found.'
        );
        break;
      case 'SecurityError':
      case 'PermissionDeniedError':
        // Do nothing; this is the same as the user canceling the call.
        break;
      default:
        console.log(e);
        alert('Error opening your camera and/or microphone: ' + e.message);
        break;
    }

    this.closeVideoCall();
  }

  private createPeerConnection(): void {
    console.log('creating PeerConnection...');
    this.peerConnection = new RTCPeerConnection(ENV_RTCPeerConfiguration);

    this.peerConnection.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
      console.log('onicecandidate::', event);
      if (event.candidate) {
        this.dataService.sendMessage({
          type: 'ice-candidate',
          data: event.candidate,
        });
      }
    };

    this.peerConnection.oniceconnectionstatechange = (event: Event) => {
      console.log('oniceconnectionstatechange::', event);
      console.log(
        'iceConnectionState::',
        this.peerConnection.iceConnectionState
      );
      switch (this.peerConnection.iceConnectionState) {
        case 'closed':
        case 'failed':
        case 'disconnected':
          this.closeVideoCall();
          break;
      }
    };

    this.peerConnection.onsignalingstatechange = (event: Event) => {
      console.log('onsignalingstatechange::', event);
      switch (this.peerConnection.signalingState) {
        case 'closed':
          this.closeVideoCall();
          break;
      }
    };

    this.peerConnection.ontrack = (event: RTCTrackEvent) => {
      console.log('ontrack:::', event);
      this.remoteVideo.nativeElement.srcObject = event.streams[0];
    };
  }

  private closeVideoCall(): void {
    console.log('Closing call');

    if (this.peerConnection) {
      console.log('--> Closing the peer connection');

      this.peerConnection.ontrack = null;
      this.peerConnection.onicecandidate = null;
      this.peerConnection.oniceconnectionstatechange = null;
      this.peerConnection.onsignalingstatechange = null;

      // Stop all transceivers on the connection
      this.peerConnection.getTransceivers().forEach((transceiver) => {
        transceiver.stop();
      });

      // Close the peer connection
      this.peerConnection.close();
      //this.peerConnection = null;

      this.inCall = false;
    }
  }

  private handleICECandidateMessage(msg: RTCIceCandidate): void {
    const candidate = new RTCIceCandidate(msg);
    this.peerConnection.addIceCandidate(candidate).catch(this.reportError);
  }

  private handleHangupMessage(msg: Message): void {
    console.log(msg);
    this.closeVideoCall();
  }

  private reportError = (e: Error) => {
    console.log('got Error: ' + e.name);
    console.log(e);
  };

  startLocalVideo(): void {
    console.log('starting local stream');
    this.localStream.getTracks().forEach((track) => {
      track.enabled = true;
    });
    this.localVideo.nativeElement.srcObject = this.localStream;
    this.localVideoActive = true;
  }

  hangUp(): void {
    this.dataService.sendMessage({ type: 'hangup', data: '' });
    this.closeVideoCall();
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
      const offer: RTCSessionDescriptionInit = await this.peerConnection.createOffer(offerOptions);
      // Establish the offer as the local peer's current description.
      await this.peerConnection.setLocalDescription(offer);
      this.inCall = true;
      this.dataService.sendMessage({ type: 'offer', data: offer });
    } catch (err: any) {
      this.handleGetUserMediaError(err);
    }
  }
}
