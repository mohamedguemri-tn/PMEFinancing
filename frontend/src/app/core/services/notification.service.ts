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
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected ||
        this.hubConnection?.state === signalR.HubConnectionState.Connecting) {
      return;
    }

    const hubUrl = environment.apiUrl.replace('/api', '') + '/hubs/notifications';

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, { accessTokenFactory: () => token })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    this.hubConnection.on('ReceiveNotification', (notification: AppNotification) => {
      const current = this.notificationsSubject.value;
      this.notificationsSubject.next([{ ...notification, isRead: false }, ...current]);
    });

    this.hubConnection
      .start()
      .catch(err => console.error('SignalR connection error:', err));
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
