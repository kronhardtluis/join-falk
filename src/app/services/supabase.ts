import { createClient } from '@supabase/supabase-js';
import { Injectable, signal } from '@angular/core';
import { environment } from '../environments/environment.example';

@Injectable({
  providedIn: 'root',
})
export class Supabase {
  private superbaseURL = environment.supabaseUrl;
  private supabaseKEY = environment.supabaseKey;
  public supabase = createClient(this.superbaseURL, this.supabaseKEY);
  public notificationMessage = signal<string>('');

  /**
  * Triggers the notification toast by setting the message signal.
  * The UI reacts by adding the '.show' class, which initiates a CSS transition
  * for opacity and right-positioning.
  * @param {string} message - The text to be displayed.
  */
  showNotification(message:string){
    this.notificationMessage.set(message);
    setTimeout(() => {this.notificationMessage.set('');}, 1250);
  }
}
