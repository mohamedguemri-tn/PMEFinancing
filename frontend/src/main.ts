import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { authGuard } from './app/auth/auth.guard';
import { HttpErrorInterceptor } from './app/auth/http-error.interceptor';
import { AuthInterceptor } from './app/auth/auth.interceptor';

bootstrapApplication(AppComponent, {
  providers: [
    provideAnimations(),
    provideHttpClient(withInterceptorsFromDi()),
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
        path: 'pme',
        loadChildren: () => import('./app/pme/pme.module').then((m) => m.PmeModule),
        canActivate: [authGuard],
        data: { roles: ['PME'] },
      },
      {
        path: 'investor',
        loadComponent: () => import('./app/investor/investor.component').then((m) => m.InvestorComponent),
        canActivate: [authGuard],
        data: { roles: ['INVESTOR'] },
      },
      {
        path: 'governor',
        loadComponent: () => import('./app/governor/governor.component').then((m) => m.GovernorComponent),
        canActivate: [authGuard],
        data: { roles: ['GOVERNOR'] },
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