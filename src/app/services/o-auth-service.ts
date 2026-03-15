import { Injectable, inject, signal } from '@angular/core';
import { Supabase } from './supabase';
import { ContactService } from './contact-service.ts';
import { Router } from '@angular/router';
import { Contact } from '../interfaces/contact.interface';

@Injectable({
  providedIn: 'root',
})
export class OAuthService {
  dbService = inject(Supabase);
  contactService = inject(ContactService);
  router = inject(Router);
  public logingStatus = signal<string>(localStorage.getItem('join_login_status') || 'nobody');
  public logedUser = signal<string>(localStorage.getItem('join_user_name') || "");
  public activeSite = signal<string>("");
  public activeForm = signal<'log-in' | 'sign-up'>('log-in');

  constructor(){
    this.checkPersistedSession();
  }

  /**
   * Registers a new user with Supabase Auth after verifying email availability.
   * 1. Checks if the email is already in the contacts list to prevent duplicates.
   * 2. Registers the user in Supabase Auth with metadata.
   * 3. Synchronizes the contact in the database.
   * 4. Automatically signs in the user upon successful registration.
   * @param email - User's email address.
   * @param pass - User's chosen password.
   * @param name - Full name to be stored in user_metadata and contacts.
   * @returns {Promise<{data: any, error: any}>}
   */
  async signUp(email: string, pass: string, name: string) {
    if (this.contactService.contacts().length === 0) await this.contactService.getContacts();
    const EMAIL_TAKEN = this.contactService.contacts().some(c => c.email.toLowerCase() === email.toLowerCase());
    if (EMAIL_TAKEN) {
      this.dbService.showNotification("This email is already registered.");
      return { data: null, error: { message: 'Email taken' } };
    }
    const { data, error } = await this.dbService.supabase.auth.signUp({
      email,
      password: pass,
      options: { data: { full_name: name } }
    });
    if (error) {
      this.dbService.showNotification("Registration failed.");
      return { data: null, error };
    }
    if (data.user) {
      await this.ensureContactExists(email, name);
    }
    this.dbService.showNotification("Registration successful.");
    await this.signIn(email, pass);
    return { data, error: null };
  }

  /**
   * Authenticates a user and manages the persistence of the login state.
   * @param email - User's email address.
   * @param pass - User's password.
   * @param rememberMe - If true, the 'User' status is saved in localStorage.
   * @returns The data object on success, or an object with error on failure. // ZMIENIONO
   */
  async signIn(email: string, pass: string, rememberMe: boolean = false) {
    const { data, error } = await this.dbService.supabase.auth.signInWithPassword({
      email,
      password: pass,
    });
    if (error) {
      this.dbService.showNotification("Invalid email or password.");
      return { data: null, error };
    }
    const USER_NAME = data.user?.user_metadata['full_name'] || data.user?.email || "";
    await this.ensureContactExists(email, USER_NAME);
    localStorage.setItem('join_remember_me', rememberMe.toString());
    this.setLoginStatus('user');
    this.logedUser.set(USER_NAME)
    if (rememberMe) {
      localStorage.setItem('join_user_name', USER_NAME)
    } else {
      localStorage.removeItem('join_user_name');
    }
    return data;
  }

  /**
   * Ensures that a contact corresponding to the authenticated user exists in the database.
   * * This method performs a synchronization check:
   * 1. Fetches the current contact list if the local state is empty.
   * 2. Verifies if the user's email is already present in the contacts collection.
   * 3. If missing (e.g., after manual deletion), it creates a new contact using
   * provided metadata and assigns a random color from the predefined palette.
   * 4. Refreshes the local contacts signal after a successful insertion to maintain data integrity.
   * @param email - The email address of the user to check or create.
   * @param name - The full name of the user used for contact creation.
   * @returns {Promise<void>} A promise that resolves when the synchronization check is complete.
   * @private
   */
  private async ensureContactExists(email: string, name: string) {
    if (this.contactService.contacts().length === 0) await this.contactService.getContacts();
    const CONTACT_EXISTS = this.contactService.contacts().some(c => c.email === email);
    if (!CONTACT_EXISTS) {
      const NEW_CONTACT: Contact = {
        name: name,
        email: email,
        phone: "0",
        color: this.contactService.getRandomColor(),
      };
      const { error } = await this.dbService.supabase.from('contacts').insert([NEW_CONTACT]);
      if (!error) {
        await this.contactService.getContacts();
      }
    }
  }

  /**
   * Manually sets the login status (e.g., for Guest access).
   * @param status - The status string to set ('Guest', 'User', or 'guest').
   */
  setLoginStatus(status:string){
    this.logingStatus.set(status);
    localStorage.setItem('join_login_status', status);
    if (status === 'guest') {
      this.logedUser.set('Guest');
      localStorage.setItem('join_user_name', 'Guest');
    }
  }

  /**
   * Verifies if a session exists in Supabase Auth or falls back to localStorage status.
   * Called automatically in the constructor to maintain user state after page refresh.
   */
  private async checkPersistedSession() {
    const { data } = await this.dbService.supabase.auth.getSession();
    const REMEMBER_ME = localStorage.getItem('join_remember_me') === 'true';
    if (data.session) {
      const NAME = data.session.user.user_metadata['full_name'];
      const EMAIL = data.session.user.email!;
      await this.ensureContactExists(EMAIL, NAME);
    }
    if (data.session && !REMEMBER_ME) {
      await this.logout();
    return;
    }
    if (data.session && REMEMBER_ME) {
      const NAME = data.session.user.user_metadata['full_name'];
      this.logedUser.set(NAME);
      localStorage.setItem('join_user_name', NAME);
    } else {
      const SAVED_STATUS = localStorage.getItem('join_login_status');
      if (SAVED_STATUS === 'guest') {
        this.logingStatus.set('guest');
        this.logedUser.set('Guest');
      } else {
        this.logingStatus.set('nobody');
      }
    }
  }

  /**
   * Signs out the current user from Supabase Auth and clears all local storage and signals.
   */
  async logout() {
    await this.dbService.supabase.auth.signOut();
    this.logingStatus.set('nobody');
    this.logedUser.set('');
    localStorage.removeItem('join_user_name');
    localStorage.removeItem('join_login_status');
    localStorage.removeItem('join_remember_me');
    this.router.navigate(['/']);
  }
}
