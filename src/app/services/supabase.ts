import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { Injectable, signal } from '@angular/core';
import { environment } from '../environments/environment.example';

export interface Contact {
  id?: number;
  created_at?: string;
  name: string;
  email: string;
  phone: string;
  color: string;
}

@Injectable({
  providedIn: 'root',
})
export class Supabase {

  private superbaseURL = environment.supabaseUrl;
  private supabaseKEY = environment.supabaseKey;
  private supabase = createClient(this.superbaseURL, this.supabaseKEY);
  channels: RealtimeChannel | undefined;
  contacts = signal<Contact[]>([]);

  /**
  * Fetches all contacts from the database, sorted alphabetically by name.
  */
  async getContacts() {
    const { data, error } = await this.supabase
      .from('contacts')
      .select('*')
      .order('name', { ascending: true });
    if (data) this.contacts.set(data);
  }

  /**
  * Establishes a real-time subscription to the 'contacts' table.
  * Automatically calls getContacts() whenever an INSERT, UPDATE, or DELETE event occurs
  * to ensure the local UI state is synchronized with the database.
  * @returns {void}
  */
  subscribeToContactsChanges(){
    this.channels = this.supabase.channel('custom-all-channel')
      .on(
        'postgres_changes',
        {event: '*', schema: 'public', table: 'contacts'},
        () => {
          this.getContacts();
        }
      )
      .subscribe();
  }

  /**
  * Lifecycle hook that cleans up resources before the service or component is destroyed.
  * Unsubscribes from the active Supabase real-time channel to prevent memory leaks.
  * @returns {void}
  */
  ngOnDestroy(){
    if(this.channels) this.supabase.removeChannel(this.channels);
  }

  /**
  * Fetches a single contact from the database by its unique identifier.
  * @param {number} id - The ID of the contact to retrieve.
  * @returns {Promise<Contact | null>} A promise that resolves to the contact object or null if not found.
  */
  async getContactById(id: number) {
    const { data, error } = await this.supabase
      .from('contacts')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      console.error('Error fetching contact:', error.message);
      return null;
    }
    return data;
  }

  /**
  * Adds a new contact to the database.
  * @param contact - The contact data to insert.
  */
  async addContact(contact: Contact) {
    const { data, error } = await this.supabase
      .from('contacts')
      .insert([contact])
      .select();
    if (!error) await this.getContacts();
  }

  /**
  * Updates an existing contact by its ID[cite: 69, 74].
  * @param id - The unique identifier of the contact.
  * @param contact - The updated contact data.
  */
  async updateContact(id: number, contact: Partial<Contact>) {
    const { error } = await this.supabase
      .from('contacts')
      .update(contact)
      .eq('id', id);
    if (!error) await this.getContacts();
  }

  /**
  * Deletes a contact from the database permanently.
  * @param id - The ID of the contact to be removed.
  */
  async deleteContact(id: number) {
    const { error } = await this.supabase
      .from('contacts')
      .delete()
      .eq('id', id);
    if (!error) await this.getContacts();
  }
}
