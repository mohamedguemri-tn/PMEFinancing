import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../core/services/auth.service';
import { WalletService } from '../core/services/wallet.service';
import { SharedModule } from '../shared/shared.module';
import { CurrentUser } from './auth.models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatIconModule,
    SharedModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  loading = false;
  feedbackState: 'idle' | 'waiting' | 'pending' | 'success' | 'error' = 'idle';
  feedbackMessage = '';

  constructor(
    private authService: AuthService,
    private walletService: WalletService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  async onConnect(): Promise<void> {
    if (!this.walletService.isMetaMaskInstalled()) {
      const snackBarRef = this.snackBar.open('MetaMask not detected — please install it', 'Install', {
        duration: 10000,
      });
      snackBarRef.onAction().subscribe(() => {
        window.open('https://metamask.io', '_blank');
      });
      return;
    }

    this.loading = true;
    this.feedbackState = 'idle';

    try {
      const walletAddress = await this.walletService.connectWallet();
      const nonce = await firstValueFrom(this.authService.getNonce(walletAddress));

      this.feedbackState = 'waiting';
      this.feedbackMessage = '';

      const signature = await this.walletService.signMessage(nonce);

      const user = await firstValueFrom(this.authService.login(walletAddress, signature));

      this.feedbackState = 'success';
      this.feedbackMessage = 'Login successful!';

      // Navigate based on role
      setTimeout(() => {
        this.navigateBasedOnRole(user);
      }, 1000); // Small delay to show success

    } catch (error) {
      this.feedbackState = 'error';
      this.feedbackMessage = error instanceof Error ? error.message : 'Login failed';
    } finally {
      this.loading = false;
    }
  }

  private navigateBasedOnRole(user: CurrentUser): void {
    switch (user.role.toUpperCase()) {
      case 'PME':
        this.router.navigate(['/pme/dashboard']);
        break;
      case 'INVESTOR':
        this.router.navigate(['/investor/dashboard']);
        break;
      case 'GUARANTOR':
        this.router.navigate(['/guarantor/dashboard']);
        break;
      case 'GOVERNOR':
        this.router.navigate(['/governor/dashboard']);
        break;
      default:
        this.router.navigate(['/login']);
    }
  }
}
