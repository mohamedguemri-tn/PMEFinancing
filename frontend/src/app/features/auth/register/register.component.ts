import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { MatStepperModule, MatStepper } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { WalletService } from '../../../core/services/wallet.service';
import { SharedModule } from '../../../shared/shared.module';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    SharedModule
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  @ViewChild(MatStepper) stepper!: MatStepper;

  isLinear = true;
  walletAddress: string | null = null;
  selectedRole: string | null = null;
  registrationForm!: FormGroup;
  isAsyncOperation = false;
  feedbackState: 'idle' | 'waiting' | 'pending' | 'success' | 'error' = 'idle';
  feedbackMessage = '';

  sectors = ['Agriculture', 'Manufacturing', 'Services', 'Technology', 'Construction', 'Other'];
  investorTypes = ['Individual', 'Institutional', 'Venture Capital'];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private walletService: WalletService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.registrationForm = this.fb.group({});
  }

  async connectWallet(): Promise<void> {
    if (!this.walletService.isMetaMaskInstalled()) {
      const snackBarRef = this.snackBar.open('MetaMask not detected — please install it', 'Install', {
        duration: 10000,
      });
      snackBarRef.onAction().subscribe(() => {
        window.open('https://metamask.io', '_blank');
      });
      return;
    }

    this.isAsyncOperation = true;
    try {
      this.walletAddress = await this.walletService.connectWallet();
      // Auto-advance to step 2
      setTimeout(() => {
        this.stepper.next();
      }, 1000); // Small delay to show the chip
    } catch (error) {
      this.snackBar.open('Failed to connect wallet', 'Close', { duration: 5000 });
    } finally {
      this.isAsyncOperation = false;
    }
  }

  selectRole(role: string): void {
    this.selectedRole = role;
    this.buildFormForRole(role);
  }

  private buildFormForRole(role: string): void {
    this.registrationForm = this.fb.group({});

    if (role === 'PME') {
      this.registrationForm.addControl('companyName', this.fb.control('', [Validators.required, Validators.minLength(2)]));
      this.registrationForm.addControl('sector', this.fb.control('', Validators.required));
      this.registrationForm.addControl('email', this.fb.control('', [Validators.required, Validators.email]));
    } else if (role === 'Investor') {
      this.registrationForm.addControl('fullName', this.fb.control('', [Validators.required, Validators.minLength(2)]));
      this.registrationForm.addControl('email', this.fb.control('', [Validators.required, Validators.email]));
      this.registrationForm.addControl('investorType', this.fb.control('', Validators.required));
    } else if (role === 'Guarantor') {
      this.registrationForm.addControl('fullName', this.fb.control('', [Validators.required, Validators.minLength(2)]));
      this.registrationForm.addControl('email', this.fb.control('', [Validators.required, Validators.email]));
      this.registrationForm.addControl('organizationName', this.fb.control('', [Validators.required, Validators.minLength(2)]));
    }
  }

  async submitRegistration(): Promise<void> {
    if (!this.registrationForm.valid || !this.walletAddress || !this.selectedRole) {
      return;
    }

    this.isAsyncOperation = true;
    this.feedbackState = 'waiting';
    this.feedbackMessage = '';

    try {
      const formValue = this.registrationForm.value as any;
      const profileData: Record<string, string> = {};

      if (this.selectedRole === 'PME') {
        profileData['companyName'] = formValue.companyName;
        profileData['sector'] = formValue.sector;
        profileData['email'] = formValue.email;
      } else if (this.selectedRole === 'Investor') {
        profileData['fullName'] = formValue.fullName;
        profileData['email'] = formValue.email;
        profileData['investorType'] = formValue.investorType;
      } else if (this.selectedRole === 'Guarantor') {
        profileData['fullName'] = formValue.fullName;
        profileData['email'] = formValue.email;
        profileData['organizationName'] = formValue.organizationName;
      }

      const nonce = await firstValueFrom(this.authService.getNonce(this.walletAddress));
      this.feedbackState = 'pending';
      this.feedbackMessage = 'Submitting registration...';

      const signature = await this.walletService.signMessage(nonce);

      await firstValueFrom(this.authService.register(this.walletAddress, signature, this.selectedRole, profileData));

      this.router.navigate(['/register/success']);
    } catch (error: any) {
      this.feedbackState = 'error';
      this.feedbackMessage = error?.error?.title || 'Registration failed';
    } finally {
      this.isAsyncOperation = false;
    }
  }

  get truncatedAddress(): string {
    if (!this.walletAddress) return '';
    return `${this.walletAddress.slice(0, 6)}...${this.walletAddress.slice(-4)}`;
  }

  getFormFieldClasses(): string {
    return 'form-field';
  }
}