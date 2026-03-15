import { Component, HostListener, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from "@angular/router";
import { Supabase } from '../../services/supabase';
import { ContactService } from '../../services/contact-service.ts';
import { OAuthService } from '../../services/o-auth-service';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  isMenuOpen = false;
  dbService = inject(Supabase);
  contactService = inject(ContactService);
  oAuthService = inject(OAuthService)

  /**
  * Toggles the visibility state of the user profile dropdown menu.
  */
  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  /**
  * Explicitly closes the user profile dropdown menu.
  */
  closeMenu() {
    this.isMenuOpen = false;
  }

  /**
  * Listens for click events across the entire document to handle "click-away" functionality.
  * If the user clicks outside of the profile toggle button (#user) and the dropdown menu itself,
  * the menu is automatically closed to enhance UX.
  * @param event - The native MouseEvent used to determine the click target.
  */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('#user') && !target.closest('.dropdown')) {
      this.isMenuOpen = false;
    }
  }

  /**
  * Orchestrates the user logout process by calling the shared authentication service.
  * Clears session data and redirects the user to the landing page.
  */
  logOut(){
    this.oAuthService.logout();
  }
}
