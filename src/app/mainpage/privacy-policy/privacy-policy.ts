import { Component } from '@angular/core';
import { Location } from '@angular/common';

@Component({
  selector: 'app-privacy-policy',
  imports: [],
  templateUrl: './privacy-policy.html',
  styleUrl: './privacy-policy.scss',
})
export class PrivacyPolicy {

  /**
  * Initializes the component with the Angular Location service.
  * @param location - A service that facilitates interaction with the browser's URL and navigation history.
  */
  constructor(private location: Location) {}

  /**
  * Navigates one step backward in the browser's history stack.
  * This method uses the platform-native back functionality,
  * effectively simulating the user clicking the browser's "Back" button.
  * @returns {void}
  */
  goBack(): void {
    this.location.back();
  }
}
