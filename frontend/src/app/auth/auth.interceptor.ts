import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { WalletService } from './wallet.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private walletService: WalletService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.walletService.getToken();
    console.log('Token from storage:', token?.substring(0, 20));
    if (token) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
      console.log('Auth header:', request.headers.get('Authorization')?.substring(0, 30));
    }
    return next.handle(request);
}
}