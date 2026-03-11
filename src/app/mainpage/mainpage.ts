import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-mainpage',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './mainpage.html',
  styleUrl: './mainpage.scss',
})
export class Mainpage {
  userForm = new FormGroup(
    {
      name: new FormControl('', {
        // Nach dem Komma validators: [] kommen unsere Validatoren rein.
        // Validators gefolgt vom Punkt, dann sehen wir, was es alles zur Auswahl gibt.
        validators: [Validators.required],
      }),
      email: new FormControl('', {
        validators: [Validators.required, Validators.email],
      }),
      password: new FormControl('', {
        validators: [Validators.required, Validators.minLength(8)],
      }),
      confirm: new FormControl('', {
        validators: [Validators.required, Validators.minLength(8)],
      }),
      checkBox: new FormControl(false, {
        validators: [Validators.requiredTrue],
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

  formSubmit() {
    if (this.userForm.valid) {
      console.log(this.userForm.value);
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

  togglePassword(event: MouseEvent) {
    event.preventDefault(); // Verhindert, dass der Input den Fokus verliert
    this.isPasswordVisible = !this.isPasswordVisible;
  }
}
