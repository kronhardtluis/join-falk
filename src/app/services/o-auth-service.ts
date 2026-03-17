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
  public rememberedEmail = signal<string>(localStorage.getItem('join_remembered_email') || "");
  public activeSite = signal<string>("");
  public activeForm = signal<'log-in' | 'sign-up'>('log-in');
  public showGreetingsAnimationMobile = signal<boolean>(true);

  /**
  * Initializes the OAuthService and restores the user's authentication state.
  * The constructor triggers an immediate check for a persisted session to ensure
  * that the user's login status is consistent across page reloads or browser restarts.
  * It bridges the gap between Supabase Auth's internal persistence and the
  * application's reactive signals.
  */
  constructor(){
    this.checkPersistedSession();
  }

  /**
  * Orchestrates the registration process: validation, auth creation,
  * contact synchronization, and automatic login.
  */
  async signUp(email: string, pass: string, name: string) {
    const IS_AVAILABLE = await this.validateEmailAvailability(email);
    if (!IS_AVAILABLE) return { data: null, error: { message: 'Email taken' } };
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
      this.dbService.showNotification("Registration successful.");
      await this.signIn(email, pass);
    }
    return { data, error: null };
  }

  /**
  * Helper: Checks if the email is already registered in the contacts list.
  * @private
  */
  private async validateEmailAvailability(email: string): Promise<boolean> {
    if (this.contactService.contacts().length === 0) {
      await this.contactService.getContacts();
    }
    const EMAIL_TAKEN = this.contactService.contacts().some(
      contact => contact.email.toLowerCase() === email.toLowerCase()
    );
    if (EMAIL_TAKEN) {
      this.dbService.showNotification("This email is already registered.");
      return false;
    }
    return true;
  }

  /**
  * Authenticates a user using email and password via Supabase Auth.
  * Upon successful login, it:
  * 1. Validates or creates a corresponding contact entry.
  * 2. Updates the global reactive state (`logedUser`, `logingStatus`).
  * 3. Triggers the email persistence logic based on the 'Remember Me' preference.
  * @param email - The user's email address.
  * @param pass - The user's password.
  * @param rememberMe - Boolean flag to persist the email for future sessions.
  * @returns {Promise<any>} The Supabase Auth response data.
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
    this.setLoginStatus('user');
    this.logedUser.set(USER_NAME)
    this.setRememberedEmail(rememberMe, email)
    return data;
  }

  /**
  * Manages the persistence of the user's email address in local storage.
  * Used for the "Remember Me" feature to pre-fill the login form in future visits.
  * @param status - If true, the email will be saved; if false, it will be removed.
  * @param email - The email address to persist (required if status is true).
  * @private
  */
  setRememberedEmail(status:boolean, email:string = ""){
    if (status) {
      localStorage.setItem('join_remembered_email', email);
      this.rememberedEmail.set(email);
    } else {
      localStorage.removeItem('join_remembered_email');
      this.rememberedEmail.set("");
    }
  }

  /**
  * Synchronizes the authenticated user with the contacts database.
  * This method ensures that every registered or logged-in user has a corresponding
  * entry in the 'contacts' table. If the email is not found in the current contact list:
  * 1. It fetches the latest contacts to prevent race conditions.
  * 2. It creates a new contact profile with default values and a random avatar color.
  * 3. It persists the new contact and refreshes the global contact state.
  * @param email - The email address of the user to verify/create.
  * @param name - The full name of the user to be used for the contact profile.
  * @returns {Promise<void>}
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
  * Updates authentication status and manages login side effects.
  * Synchronizes the `logingStatus` signal and localStorage. For 'guest' status,
  * it automatically sets the display name to 'Guest'. For any active session,
  * it triggers a 3.5s delay to hide the mobile greeting animation.
  * @param status - The new auth state ('user', 'guest', or 'nobody').
  */
  setLoginStatus(status:string){
    this.logingStatus.set(status);
    localStorage.setItem('join_login_status', status);
    if (status === 'guest') {
      this.logedUser.set('Guest');
      localStorage.setItem('join_user_name', 'Guest');
    }
    if(status != 'nobody'){
    setTimeout(() => {
        this.showGreetingsAnimationMobile.set(false);
      }, 3500);
    }
  }

  /**
  * Orchestrates the initial authentication check upon service instantiation.
  * It attempts to retrieve an existing session from Supabase Auth.
  * Depending on the result, it routes the logic to either handle a
  * valid user session or fallback to guest/anonymous status.
  * @returns {Promise<void>}
  * @private
  */
  private async checkPersistedSession() {
    const { data: { session } } = await this.dbService.supabase.auth.getSession();
    if (session) {
      await this.handleActiveSession(session);
      return;
    }
    this.handleGuestOrAnonymous();
  }

  /**
  * Processes an active Supabase session and synchronizes the application state.
  * This method:
  * 1. Extracts user metadata (full name and email).
  * 2. Ensures the user exists in the local 'contacts' database.
  * 3. Updates reactive signals (`logedUser`, `logingStatus`) to reflect the logged-in state.
  * 4. Persists basic user info to localStorage for quick access during UI initialization.
  * @param session - The active Supabase Auth session object.
  * @returns {Promise<void>}
  * @private
  */
  private async handleActiveSession(session: any) {
    const NAME = session.user.user_metadata['full_name'];
    const EMAIL = session.user.email!;
    await this.ensureContactExists(EMAIL, NAME);
    this.logedUser.set(NAME);
    this.logingStatus.set('user');
    localStorage.setItem('join_login_status', 'user');
  }

  /**
  * Manages the application state when no valid Auth session is found.
  * It checks `localStorage` for a previously set 'guest' status. If found,
  * it maintains the guest session; otherwise, it resets the state to 'nobody',
  * effectively requiring the user to log in.
  * @private
  */
  private handleGuestOrAnonymous() {
    const SAVED_STATUS = localStorage.getItem('join_login_status');
    if (SAVED_STATUS === 'guest') {
      this.logingStatus.set('guest');
      this.logedUser.set('Guest');
    } else {
      this.logingStatus.set('nobody');
      this.logedUser.set('');
    }
  }

  /**
  * Signs out the current user from Supabase Auth and clears all local storage and signals.
  */
  async logout() {
    const { error } = await this.dbService.supabase.auth.signOut();
    if(!error){
      this.logingStatus.set('nobody');
      this.logedUser.set('');
      localStorage.removeItem('join_user_name');
      localStorage.removeItem('join_login_status');
      this.router.navigate(['/']);
      this.showGreetingsAnimationMobile.set(true);
    }
  }
}
