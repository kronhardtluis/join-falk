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
  loginFailed = signal<boolean>(false);
  dbService = inject(Supabase);
  router = inject(Router);
  activeState = this.dbService.activeForm;
  userForm = new FormGroup(
    {
      name: new FormControl('', {
        // Nach dem Komma validators: [] kommen unsere Validatoren rein.
        // Validators gefolgt vom Punkt, dann sehen wir, was es alles zur Auswahl gibt.
        //validators: [Validators.required],
      }),
      email: new FormControl('', {
        validators: [Validators.required, Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)],
      }),
      password: new FormControl('', {
        validators: [Validators.required],
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
    if (this.dbService.logingStatus() !== 'nobody') {
      this.router.navigate(['/summary']);
    }
    this.dbService.getContacts();
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
    //this.userForm.markAllAsTouched();
    if (this.activeState() === 'sign-up' && this.userForm.invalid) {
      this.handleDisabledClick();
      return;
    }
    const { email, password, name, checkBox } = this.userForm.value;
    if (this.activeState() === 'sign-up') {
        const EXISTS = this.dbService.contacts().some(c => c.email === email);
        if (EXISTS) {
          this.dbService.showNotification("This email is already registered.");
          return;
        }
      const RESULT = await this.dbService.signUp(email!, password!, name!);
       if (RESULT && 'error' in RESULT && RESULT.error){
        this.loginFailed.set(true);
        this.dbService.showNotification("Registration failed.");
       }
       else {
          this.setFormular('log-in');
          this.router.navigate(['/summary']);
        }
      } else {
        const RESULT = await this.dbService.signIn(email!, password!, checkBox!);
        if (RESULT && 'error' in RESULT && RESULT.error) {
          this.loginFailed.set(true);
          this.userForm.get('email')?.setErrors({ supabase: true });
          this.userForm.get('password')?.setErrors({ supabase: true });
        } else {
          this.router.navigate(['/summary']);
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
    if (state === 'sign-up') {
      this.setValid(this.userForm);
    } else {
      this.clearValid(this.userForm)
    }
    this.updateValid(this.userForm)
  }

  /**
  * Applies validation rules to the form controls required for the sign-up process.
  * @param form - The FormGroup containing the user registration controls.
  */
  setValid(form: FormGroup): void{
    form.get('name')?.setValidators([Validators.required]);
    //form.get('email')?.setValidators([Validators.required, Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)]);
    form.get('password')?.setValidators([Validators.required, Validators.minLength(8)]);
    form.get('confirm')?.setValidators([Validators.required, Validators.minLength(8)]);
    form.get('checkBox')?.setValidators([Validators.requiredTrue]);
  }

  /**
  * Removes all validators from the form controls.
  * Used when switching to login mode where certain fields are not required.
  * @param form - The FormGroup whose controls' validators should be cleared.
  */
  clearValid(form: FormGroup): void{
    form.get('name')?.clearValidators();
    //form.get('email')?.clearValidators();
    form.get('password')?.clearValidators();
    form.get('confirm')?.clearValidators();
    form.get('checkBox')?.clearValidators();
  }

  /**
  * Re-evaluates the value and validity status of each form control.
  * This ensures the UI reflects the current validation state after changes.
  * @param form - The FormGroup containing the controls to be updated.
  */
  updateValid(form: FormGroup): void{
    form.get('name')?.updateValueAndValidity();
    form.get('email')?.updateValueAndValidity();
    form.get('password')?.updateValueAndValidity();
    form.get('confirm')?.updateValueAndValidity();
    form.get('checkBox')?.updateValueAndValidity();
  }

  /**
   * Performs a guest login by updating the global login status and redirecting the user.
   * This allows access to the application without a personal account.
   * @param value - The login mode, typically 'Guest'.
   */
  loging(value:string){
    if(value === 'guest'){
      this.dbService.setLoginStatus('guest');
      this.dbService.logedUser.set('Guest')
    }
  }

}
