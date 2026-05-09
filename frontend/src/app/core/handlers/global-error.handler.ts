import { ErrorHandler, Injectable, Injector, NgZone } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '../../../environments/environment';
import { ErrorParserService } from '../services/error/error-parser.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  constructor(private injector: Injector, private zone: NgZone) {}

  handleError(error: any): void {
    const snackBar = this.injector.get(MatSnackBar);
    const errorParser = this.injector.get(ErrorParserService);

    const message = errorParser.parseError(error);
    const isHttpError = error instanceof HttpErrorResponse;

    this.zone.run(() => {
      if (isHttpError) {
        snackBar.open(message, 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
      } else {
        snackBar.open('An unexpected error occurred — check the console', 'Close', { duration: 5000 });
      }
    });

    if (environment.development) {
      console.group('%c BlockFin Error', 'color: red; font-weight: bold');
      console.error(error);
      if (isHttpError && error.error) {
        console.log('Error Body:', error.error);
      }
      console.groupEnd();
    } else {
      console.error(error);
    }
  }
}
