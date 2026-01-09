import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';
import { fromEvent, merge, of } from 'rxjs';
import { mapTo, startWith } from 'rxjs/operators';

@Component({
  standalone: false,
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {
  form!: FormGroup;
  online$ = merge(
    fromEvent(window, 'online').pipe(mapTo(true)),
    fromEvent(window, 'offline').pipe(mapTo(false)),
    of(navigator.onLine)
  ).pipe(startWith(navigator.onLine));

  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  showPassword = false;
  capsLockOn = false;

  ngOnInit() {
    this.form = this.fb.group({
      email: [this.auth.getRememberedEmail(), [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      remember: [!!this.auth.getRememberedEmail()]
    });

    const passwordCtrl = this.form.get('password');
    passwordCtrl?.valueChanges.subscribe(() => {
      const errs = passwordCtrl.errors || {};
      if ('invalid' in errs) {
        delete errs['invalid'];
        const hasOther = Object.keys(errs).length > 0;
        passwordCtrl.setErrors(hasOther ? errs : null);
      }
    });
  }

  get f() { return this.form.controls; }

  submit() {
    if (this.form.invalid) return;
    const v = this.form.value as { email: string; password: string; remember: boolean };
    const email = (v.email || '').trim().toLowerCase();
    const password = (v.password || '').trim();
    const remember = !!v.remember;
    this.auth.login(email, password, remember).subscribe({
      next: () => this.router.navigate(['/home']),
      error: () => {
        this.form.get('password')?.setErrors({ invalid: true });
      }
    });
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  onPasswordKeyEvent(event: KeyboardEvent) {
    this.capsLockOn = !!event.getModifierState && event.getModifierState('CapsLock');
  }
}
