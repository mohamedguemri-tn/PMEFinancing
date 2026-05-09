import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ErrorParserService {
  /**
   * Parses an HttpErrorResponse into a human-readable message.
   * @param error The error response to parse.
   * @returns A string representing the error message.
   */
  public parseError(error: any): string {
    if (error instanceof HttpErrorResponse) {
      // Check for ProblemDetails title/detail
      if (error.error) {
        if (error.error.detail) {
          return error.error.detail;
        }
        if (error.error.title) {
          return error.error.title;
        }
      }
      
      // Fallback to error message
      if (error.message) {
        return error.message;
      }
    }

    if (error && error.message) {
      return error.message;
    }

    return 'An unknown error occurred';
  }
}
