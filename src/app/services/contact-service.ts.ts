import { Injectable, signal, inject } from '@angular/core';
import { Supabase } from './supabase';
import { Contact } from '../interfaces/contact.interface';
import { RealtimeChannel } from '@supabase/supabase-js';

@Injectable({ providedIn: 'root' })
export class ContactService {
  dbService = inject(Supabase);
  public contacts = signal<Contact[]>([]);
  channels: RealtimeChannel | undefined;

  /**
  * Establishes a real-time subscription to database changes via Supabase Channels.
  * Listens for all PostgreSQL operations (INSERT, UPDATE, DELETE) on the 'public' schema.
  * When a change is detected, it automatically triggers {@link getContacts} to synchronize
  * the local application state with the remote database.
  * Note: This method implements a singleton-like pattern for the channel to prevent
  * multiple redundant subscriptions.
  * @returns {void}
  */
  subscribeToChanges() {
    if (this.channels) return;
    this.channels = this.dbService.supabase
      .channel('contacts-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        this.getContacts();
      })
      .subscribe();
  }

  /**
  * Lifecycle hook that cleans up resources before the service or component is destroyed.
  * Unsubscribes from the active Supabase real-time channel to prevent memory leaks.
  * @returns {void}
  */
  ngOnDestroy() {
    if (this.channels) {
      this.channels.unsubscribe();
      this.dbService.supabase.removeChannel(this.channels);
      this.channels = undefined;
    }
  }

  /**
  * Fetches all contacts from the database, sorted alphabetically by name.
  */
  async getContacts() {
    const { data } = await this.dbService.supabase
      .from('contacts')
      .select('*')
      .order('name', { ascending: true });
    if (data) this.contacts.set(data);
  }

  /**
  * Fetches a single contact from the database by its unique identifier.
  * @param {number} id - The ID of the contact to retrieve.
  * @returns {Promise<Contact | null>} A promise that resolves to the contact object or null if not found.
  */
  async getContactById(id: number) {
    const { data, error } = await this.dbService.supabase.from('contacts').select('*').eq('id', id).single();
    if (error) {
      this.dbService.showNotification('Error fetching contact.');
      return null;
    }
    return data;
  }

  /**
  * Selects a random hex color code from a predefined professional color palette.
  * These colors are used as background colors for contact avatars.
  * @returns {string} A string representing a hex color code (e.g., '#FF7A00').
  */
  getRandomColor():string{
    const COLORS = [
    '#FF7A00', '#FF5EB3', '#6E52FF', '#9327FF', '#00BEE8',
    '#1FD7C1', '#FF745E', '#FFA35E', '#FC71FF', '#FFC701',
    '#0038FF','#C3FF2B', '#FFE62B','#FF4646','#FFBB2B'
    ];
    const INDEX = Math.floor(Math.random() * COLORS.length);
    return COLORS[INDEX];
  }

  /**
  * Adds a new contact to the database.
  * @param contact - The contact data to insert.
  */
  async addContact(contact: Contact) {
    const { data, error } = await this.dbService.supabase.from('contacts').insert([contact]).select();
    if (!error) await this.getContacts();
  }

  /**
  * Updates an existing contact by its ID[cite: 69, 74].
  * @param id - The unique identifier of the contact.
  * @param contact - The updated contact data.
  */
  async updateContact(id: number, contact: Partial<Contact>) {
    const { error } = await this.dbService.supabase.from('contacts').update(contact).eq('id', id);
    if (!error) await this.getContacts();
  }

  /**
  * Deletes a contact from the database permanently.
  * @param id - The ID of the contact to be removed.
  */
  async deleteContact(id: number) {
    const { error } = await this.dbService.supabase.from('contacts').delete().eq('id', id);
    if (!error) await this.getContacts();
  }

  /**
  * Generates initials from a given full name.
  * Extracts the first letter of the first and second name parts and converts them to uppercase.
  * @param name - The full name string to process (e.g., "John Doe").
  * @returns A string containing up to two uppercase initials (e.g., "JD").
  * Returns an empty string if the input is empty or invalid.
  */
  getInitials(name: string): string {
    if (!name || typeof name !== 'string') {return '';}
    const NAME = name.trim().split(/\s+/);
    const FIRST_LETTER = NAME.length > 0 ? NAME[0][0].toUpperCase() : '';
    const SECOND_LETTER = NAME.length > 1 ? NAME[1][0].toUpperCase() : '';
    return FIRST_LETTER + SECOND_LETTER;
  }
}
