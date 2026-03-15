import { Component } from '@angular/core';
import { Location } from '@angular/common';

@Component({
  selector: 'app-legal-notice',
  imports: [],
  templateUrl: './legal-notice.html',
  styleUrl: './legal-notice.scss',
})
export class LegalNotice {

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
