import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';

@Component({
  standalone: false,
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
})
export class RegisterPage implements OnInit {
  form!: FormGroup;
  showPassword = false;
  isLoading = false;

  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private toastController = inject(ToastController);

  ngOnInit() {
    this.form = this.fb.group({
      businessName: ['', [Validators.required, Validators.minLength(3)]],
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  get f() { return this.form.controls; }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  async submit() {
    if (this.form.invalid) return;

    this.isLoading = true;
    const { businessName, fullName, email, password } = this.form.value;

    // Send metadata to Supabase Auth
    // The backend trigger handle_new_user() will catch this metadata
    const registerData = {
      email: email.trim(),
      password,
      options: {
        data: {
          business_name: businessName.trim(),
          full_name: fullName.trim()
        }
      }
    };

    this.auth.register(registerData).subscribe({
      next: async () => {
        this.isLoading = false;
        const toast = await this.toastController.create({
          message: '¡Registro exitoso! Bienvenido a SmartPOS.',
          duration: 2000,
          color: 'success',
          position: 'bottom'
        });
        await toast.present();
        this.router.navigate(['/home']);
      },
      error: async (err: any) => {
        this.isLoading = false;
        console.error('Registration error details:', JSON.stringify(err, null, 2));
        const toast = await this.toastController.create({
          message: 'Error en el registro. ' + (err.error?.mensaje || err.error?.message || err.message || 'Intente nuevamente.'),
          duration: 3000,
          color: 'danger',
          position: 'bottom'
        });
        await toast.present();
      }
    });
  }
}
