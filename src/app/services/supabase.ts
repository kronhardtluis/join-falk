import { createClient } from './../../../node_modules/@supabase/supabase-js/src/index';
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

  contacts = signal<Contact[]>([]);

  /**
   * Fetches all contacts from the database, sorted alphabetically by name.
   */
  async getContacts() {
    const { data, error } = await this.supabase
      .from('contacts')
      .select('*')
      .order('name', { ascending: true });
    if (data) {
      this.contacts.set(data);
    }
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
