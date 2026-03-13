import { Component, signal, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { Supabase } from '../services/supabase';

@Component({
  selector: 'app-mainpage',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './mainpage.html',
  styleUrl: './mainpage.scss',
})
export class Mainpage {
  activeState = signal<'log-in' | 'sign-up'>("log-in");
  loginFailed = signal<boolean>(false);
  dbService = inject(Supabase);
  router = inject(Router);
  userForm = new FormGroup(
    {
      name: new FormControl('', {
        // Nach dem Komma validators: [] kommen unsere Validatoren rein.
        // Validators gefolgt vom Punkt, dann sehen wir, was es alles zur Auswahl gibt.
        //validators: [Validators.required],
      }),
      email: new FormControl('', {
        //validators: [Validators.required, Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)],
      }),
      password: new FormControl('', {
        //validators: [Validators.required, Validators.minLength(8)],
      }),
      confirm: new FormControl('', {
        //validators: [Validators.required, Validators.minLength(8)],
      }),
      checkBox: new FormControl(false, {
        //validators: [Validators.requiredTrue],
      }),
    },
    {
      // Custom Validator für den Passwort-Abgleich
      validators: (group) => {
        const password = group.get('password')?.value;
        const confirm = group.get('confirm')?.value;
        return password === confirm ? null : { mismatch: true };
      },
    },
  );

  ngOnInit(){
    this.dbService.activeSite.set("log-in");
    if (this.dbService.logingStatus() !== 'guest') {
      this.router.navigate(['/summary']);
    }
  }

  ngOnDestroy() {
    this.dbService.activeSite.set("");
  }

  /**
   * Handles the submission of the user form.
   * Depending on the active state, it either registers a new user or signs in an existing one.
   * On failure during login, it triggers custom 'supabase' errors to highlight the inputs.
   */
  async formSubmit() {
    this.loginFailed.set(false);
    if (this.activeState() === 'sign-up' && this.userForm.invalid) {
      this.handleDisabledClick();
      return;
    }
    const { email, password, name, checkBox } = this.userForm.value;
    try {
      if (this.activeState() === 'sign-up') {
        await this.dbService.signUp(email!, password!, name!);
        this.setFormular('log-in');
      } else {
        await this.dbService.signIn(email!, password!, checkBox!);
        this.router.navigate(['/summary']);
      }
    } catch (error:any) {
      if (this.activeState() === 'log-in') {
        this.loginFailed.set(true);
        this.userForm.get('email')?.setErrors({ supabase: true });
        this.userForm.get('password')?.setErrors({ supabase: true });
      }
    }
  }

  formReset() {
    this.userForm.reset();
  }

  toggleCheckBox() {
    const currentValue = this.userForm.get('checkBox')?.value;
    this.userForm.get('checkBox')?.setValue(!currentValue);
    this.userForm.get('checkBox')?.markAsTouched(); // Damit Fehlermeldungen getriggert werden
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password')?.value;
    const confirm = form.get('confirm')?.value;

    // Wenn sie nicht gleich sind, setzen wir einen Fehler "mismatch"
    return password === confirm ? null : { mismatch: true };
  }

  handleDisabledClick() {
    if (this.userForm.invalid) {
      // Das lässt alle Fehlermeldungen und roten Ränder aufleuchten
      this.userForm.markAllAsTouched();
    }
  }

  isPasswordVisible = false;
  isConfirmVisible = false;

  togglePassword(event: MouseEvent, field: 'password' | 'confirm') {
  event.preventDefault();

  if (field === 'password') {
    this.isPasswordVisible = !this.isPasswordVisible;
  } else {
    this.isConfirmVisible = !this.isConfirmVisible;
  }
}

  /**
   * Switches between login and signup modes and adjusts field requirements.
   * @param state - The target form state ('log-in' or 'sign-up').
   */
  setFormular(state: 'log-in' | 'sign-up') {
    this.activeState.set(state);
    this.userForm.reset();
    this.loginFailed.set(false);

    const NAME_CTRL = this.userForm.get('name');
    const EMAIL_CTRL = this.userForm.get('email');
    const PASSWORD_CTRL = this.userForm.get('password');
    const CONFIRM_CTRL = this.userForm.get('confirm');
    const CHECK_CTRL = this.userForm.get('checkBox');

    if (state === 'sign-up') {
      NAME_CTRL?.setValidators([Validators.required]);
      EMAIL_CTRL?.setValidators([Validators.required, Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)]);
      PASSWORD_CTRL?.setValidators([Validators.required, Validators.minLength(8)]);
      CONFIRM_CTRL?.setValidators([Validators.required, Validators.minLength(8)]);
      CHECK_CTRL?.setValidators([Validators.requiredTrue]);
    } else {
      NAME_CTRL?.clearValidators();
      EMAIL_CTRL?.clearValidators();
      PASSWORD_CTRL?.clearValidators();
      CONFIRM_CTRL?.clearValidators();
      CHECK_CTRL?.clearValidators();
    }

    NAME_CTRL?.updateValueAndValidity();
    EMAIL_CTRL?.updateValueAndValidity();
    PASSWORD_CTRL?.updateValueAndValidity();
    CONFIRM_CTRL?.updateValueAndValidity();
    CHECK_CTRL?.updateValueAndValidity();

  }

  /**
   * Performs a guest login by updating the global login status and redirecting the user.
   * This allows access to the application without a personal account.
   * @param value - The login mode, typically 'Guest'.
   */
  loging(value:string){
    //console.log(value);
    if(value === 'Guest'){
      this.dbService.setLoginStatus('Guest');
      this.dbService.logedUser.set('Guest')
    }
  }

}
