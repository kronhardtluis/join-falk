import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from "@angular/router";

@Component({
  selector: 'app-mainpage',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './mainpage.html',
  styleUrl: './mainpage.scss',
})
export class Mainpage {
  
    // new FormGroup erlaubt uns neue, zusammenhängende Inputfelder anzulegen. --> ReactiveFormsModule
  userForm = new FormGroup({
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
  });

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
}
