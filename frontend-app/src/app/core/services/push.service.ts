import { Injectable, inject } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { environment } from '../../../environments/environment';
@Injectable({ providedIn: 'root' })
export class PushService {
  private swPush = inject(SwPush);

  async subscribe(): Promise<boolean> {
    if (!this.swPush.isEnabled) return false;
    try {
      const sub = await this.swPush.requestSubscription({ serverPublicKey: environment.VAPID_PUBLIC_KEY });
      // TODO: enviar sub al backend para registrar el endpoint
      console.log('Push subscription', sub);
      return true;
    } catch (err) {
      console.error('Push subscription error', err);
      return false;
    }
  }
}
