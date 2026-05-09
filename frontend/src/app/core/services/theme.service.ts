import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  /**
   * Retrieves the value of a CSS variable from the root element.
   * @param tokenName The name of the CSS variable (e.g., '--color-primary').
   * @returns The value of the CSS variable.
   */
  getColor(tokenName: string): string {
    if (typeof window === 'undefined') return '';
    const value = getComputedStyle(document.documentElement).getPropertyValue(tokenName).trim();
    return value;
  }

  /**
   * Helper to get common colors.
   */
  get primary(): string { return this.getColor('--color-primary'); }
  get success(): string { return this.getColor('--color-success'); }
  get warning(): string { return this.getColor('--color-warning'); }
  get danger(): string { return this.getColor('--color-danger'); }
  get governor(): string { return this.getColor('--color-governor'); }
  get textPrimary(): string { return this.getColor('--color-text-primary'); }
  get textSecondary(): string { return this.getColor('--color-text-secondary'); }
  get white(): string { return this.getColor('--color-white'); }
  get surface(): string { return this.getColor('--color-surface'); }
}
