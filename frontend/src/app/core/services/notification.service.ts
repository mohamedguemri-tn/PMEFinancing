import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AppNotification {
  type: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private hubConnection?: signalR.HubConnection;
  private readonly notificationsSubject = new BehaviorSubject<AppNotification[]>([]);

  readonly notifications$ = this.notificationsSubject.asObservable();

  get unreadCount(): number {
    return this.notificationsSubject.value.filter(n => !n.isRead).length;
  }

  startConnection(token: string): void {
    if (this.hubConnection) {
      this.stopConnection();
    }

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(environment.hubUrl, {
        accessTokenFactory: () => token,
        headers: {
          'ngrok-skip-browser-warning': 'true'
        },
        transport: signalR.HttpTransportType.WebSockets |
                   signalR.HttpTransportType.ServerSentEvents |
                   signalR.HttpTransportType.LongPolling
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this.hubConnection.on('ReceiveNotification', (notification: AppNotification) => {
      const current = this.notificationsSubject.value;
      this.notificationsSubject.next([{ ...notification, isRead: false }, ...current]);
    });

    this.hubConnection.onreconnecting(() => {
      console.log('SignalR reconnecting...');
    });

    this.hubConnection.onreconnected(() => {
      console.log('SignalR reconnected');
    });

    this.hubConnection.onclose((err) => {
      console.log('SignalR connection closed', err);
    });

    this.hubConnection
      .start()
      .then(() => console.log('SignalR connected to', environment.hubUrl))
      .catch(err => console.error('SignalR connection failed:', err));
  }

  stopConnection(): void {
    this.hubConnection?.stop();
    this.hubConnection = undefined;
  }

  markAllAsRead(): void {
    const updated = this.notificationsSubject.value.map(n => ({ ...n, isRead: true }));
    this.notificationsSubject.next(updated);
  }

  clearAll(): void {
    this.notificationsSubject.next([]);
  }
}
