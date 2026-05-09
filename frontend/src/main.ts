import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { ErrorHandler } from '@angular/core';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { importProvidersFrom } from '@angular/core';

import { AppComponent } from './app/app.component';
import { authGuard, roleGuard } from './app/core/guards/auth.guard';
import { AuthInterceptor } from './app/core/interceptors/auth.interceptor';
import { HttpErrorInterceptor } from './app/auth/http-error.interceptor';
import { GlobalErrorHandler } from './app/core/handlers/global-error.handler';

bootstrapApplication(AppComponent, {
  providers: [
    provideAnimations(),
    provideHttpClient(withInterceptorsFromDi()),
    importProvidersFrom(MatSnackBarModule),
    {
      provide: ErrorHandler,
      useClass: GlobalErrorHandler,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: HttpErrorInterceptor,
      multi: true,
    },
    provideRouter([
      {
        path: 'login',
        loadComponent: () => import('./app/auth/login.component').then((m) => m.LoginComponent),
      },
      {
        path: 'register',
        loadComponent: () => import('./app/features/auth/register/register.component').then((m) => m.RegisterComponent),
      },
      {
        path: 'register/success',
        loadComponent: () => import('./app/features/auth/register/success.component').then((m) => m.SuccessComponent),
      },
      {
        path: 'pme',
        loadChildren: () => import('./app/pme/pme.module').then((m) => m.PmeModule),
        canActivate: [authGuard, roleGuard('PME')],
      },
      {
        path: 'investor',
        loadChildren: () => import('./app/investor/investor.module').then((m) => m.InvestorModule),
        canActivate: [authGuard, roleGuard('INVESTOR')],
      },
      {
        path: 'guarantor',
        loadChildren: () => import('./app/guarantor/guarantor.module').then((m) => m.GuarantorModule),
        canActivate: [authGuard, roleGuard('GUARANTOR')],
      },
      {
        path: 'governor',
        loadChildren: () => import('./app/governor/governor.module').then((m) => m.GovernorModule),
        canActivate: [authGuard, roleGuard('GOVERNOR')],
      },
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full',
      },
      {
        path: '**',
        redirectTo: 'login',
      },
    ]),
  ],
}).catch((err) => console.error(err));