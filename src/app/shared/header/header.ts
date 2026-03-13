import { Component, HostListener, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from "@angular/router";
import { Supabase } from '../../services/supabase';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  isMenuOpen = false;
  dbService = inject(Supabase);

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }
  closeMenu() {
    this.isMenuOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('#user') && !target.closest('.dropdown')) {
      this.isMenuOpen = false;
    }
  }

  logOut(){
    this.dbService.setLoginStatus('guest');
    this.dbService.logout();
  }
}
