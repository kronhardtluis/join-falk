import { Component, signal, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { Supabase } from '../services/supabase';
import { ContactService } from '../services/contact-service.ts';
import { OAuthService } from '../services/o-auth-service';

@Component({
  selector: 'app-mainpage',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './mainpage.html',
  styleUrl: './mainpage.scss',
})
export class Mainpage {
  loginFailed = signal<boolean>(false);
  dbService = inject(Supabase);
  oAuthService = inject(OAuthService)
  router = inject(Router);
  contactService = inject(ContactService);
  activeState = this.oAuthService.activeForm;
  email = "";
  rememberMe = false;
  isPasswordVisible = false;
  isConfirmVisible = false;

  userForm = new FormGroup(
    {
      name: new FormControl('', {
      }),
      email: new FormControl('', {
        validators: [Validators.required, Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)],
      }),
      password: new FormControl('', {
        validators: [Validators.required],
      }),
      confirm: new FormControl('', {
      }),
      checkBox: new FormControl(false, {
      }),
    },
    {
      validators: (group) => {
        const password = group.get('password')?.value;
        const confirm = group.get('confirm')?.value;
        return password === confirm ? null : { mismatch: true };
      },
    },
  );

  /**
  * Initializes the component and performs essential startup checks.
  * 1. Sets the current active site state to 'log-in' for navigation highlighting.
  * 2. Guards the route by redirecting active users or guests to the summary page
  * if a session is already established.
  * 3. Pre-fetches the contacts list to ensure data availability for validation.
  * 4. Implements "Remember Me" logic: hydrates the login form with a persisted
  * email address from the OAuthService signal if available.
  */
  ngOnInit(){
    const SAVED_EMAIL = this.oAuthService.rememberedEmail();
    this.oAuthService.activeSite.set("log-in");
    if (this.oAuthService.logingStatus() !== 'nobody') {
      this.router.navigate(['/summary']);
    }
    this.contactService.getContacts();
    if (SAVED_EMAIL) {
      this.userForm.patchValue({
        email: SAVED_EMAIL,
        checkBox: true
      });
    }
  }

  /**
  * Cleans up the component state before destruction.
  * Resets the global active site signal to an empty string to ensure
  * other parts of the application (like the sidebar or header) correctly
  * reflect the navigation state.
  */
  ngOnDestroy() {
    this.oAuthService.activeSite.set("");
  }

  /**
  * Handles the submission of the user form by delegating tasks
  * to either registration or login handlers based on the active state.
  */
  async formSubmit() {
    this.loginFailed.set(false);
    if (this.activeState() === 'sign-up' && this.userForm.invalid) {
      this.handleDisabledClick();
      return;
    }
    if (this.activeState() === 'sign-up') {
      await this.handleSignUp();
    } else {
      await this.handleSignIn();
    }
  }

  /**
  * Manages the user registration process, including local validation and service calls.
  * @private
  */
  private async handleSignUp() {
    const { email, password, name } = this.userForm.value;
    const RESULT = await this.oAuthService.signUp(email!, password!, name!);
    if (RESULT?.error) {
      this.loginFailed.set(true);
    } else {
      this.setFormular('log-in');
      this.router.navigate(['/summary']);
    }
  }

  /**
  * Manages the user authentication process and handles potential login errors.
  * @private
  */
  private async handleSignIn() {
    const { email, password, checkBox } = this.userForm.value;
    const RESULT = await this.oAuthService.signIn(email!, password!, checkBox!);
    if (RESULT && 'error' in RESULT && RESULT.error) {
      this.loginFailed.set(true);
      this.applySupabaseErrors();
    } else {
      this.router.navigate(['/summary']);
    }
  }

  /**
  * Applies custom 'supabase' errors to form controls to trigger UI feedback.
  * @private
  */
  private applySupabaseErrors() {
    const CONTROLS = ['email', 'password'];
    CONTROLS.forEach(key => this.userForm.get(key)?.setErrors({ supabase: true }));
  }

  /**
  * Resets the entire user form to its initial state.
  * Clears all input values and resets the validation statuses (pristine, untouched).
  */
  formReset() {
    this.userForm.reset();
  }

  /**
  * Toggles the value of the custom checkbox within the reactive form.
  * Manually updates the form control value and marks it as touched
  * to ensure that any associated validation messages are immediately
  * triggered in the UI.
  */
  toggleCheckBox() {
    const currentValue = this.userForm.get('checkBox')?.value;
    this.userForm.get('checkBox')?.setValue(!currentValue);
    this.userForm.get('checkBox')?.markAsTouched(); // Damit Fehlermeldungen getriggert werden
    if(!currentValue) this.oAuthService.setRememberedEmail(false);
  }

  /**
  * Custom validator that checks if the password and password confirmation fields match.
  * Used at the FormGroup level to ensure data consistency during sign-up.
  * @param form - The FormGroup containing the password and confirm controls.
  * @returns {Object | null} Returns a 'mismatch' error object if values differ, otherwise null.
  */
  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password')?.value;
    const confirm = form.get('confirm')?.value;
    return password === confirm ? null : { mismatch: true };
  }

  /**
  * Handles interaction when the submit button is clicked while in a disabled or invalid state.
  * Forces the validation UI to update by marking all form controls as touched,
  * making any hidden error messages and red borders visible to the user.
  */
  handleDisabledClick() {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
    }
  }

  /**
  * Toggles the visibility of password characters in the UI.
  * This method switches the state of visibility flags for either the main
  * password field or the confirmation field. It prevents the default mouse
  * event behavior (like accidental form submission or focus loss) when
  * clicking the toggle icon.
  * @param event - The MouseEvent triggered by clicking the visibility toggle.
  * @param field - Specifies which field to toggle: 'password' or 'confirm'.
  */
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
      this.oAuthService.setLoginStatus('guest');
      this.oAuthService.logedUser.set('Guest')
    }
  }
}
