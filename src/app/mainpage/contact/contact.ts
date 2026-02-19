import { Component } from '@angular/core';
import { inject, signal, OnInit } from '@angular/core';
import { Supabase } from '../../services/supabase';

interface ContactData {
  id: number;
  name: string;
  email: string;
  phone: string;
  color: string;
}

@Component({
  selector: 'app-contact',
  imports: [],
  templateUrl: './contact.html',
  styleUrl: './contact.scss',
})
export class Contact {

  public selectedContactId = signal<number | null>(null);
  public selectedContactData = signal<ContactData | null>(null);
  public isVisible = signal(false);
  dbService = inject(Supabase);

  /**
  * Lifecycle hook that initializes the component by fetching the initial contact list
  * and establishing a real-time database subscription for live updates.
  * @returns {void}
  */
  ngOnInit(){
    this.dbService.getContacts();
    this.dbService.subscribeToContactsChanges();
  }

  /**
  * Gets the first letter of the second word (usually the last name) from a string.
  * @param {string} name - The full name string.
  * @returns {string} The second initial or an empty string if not found.
  */
  getSecondInitial(name: string): string {
    const PARTS = name.trim().split(/\s+/);
    return PARTS.length > 1 ? PARTS[1][0].toUpperCase() : '';
  }

  /**
  * Orchestrates the opening of various dialog windows based on the provided type.
  * Handles navigation/logic for adding, editing, or deleting contacts.
  * * @param {string} type - The type of dialog to open (e.g., 'addContact', 'editContact', 'deleteContact').
  * @param {number} [id] - The optional unique identifier of the contact (required for 'edit' and 'delete').
  * @returns {void}
  */
  openDialogWindow(type:'addContact' | 'editContact' | 'deleteContact', id?:number){
    if(type === "addContact"){
      console.log("Opened dialog window for add new contact. ID will be ignored.")
    } else if(type === "editContact") {
      console.log("Opened dialog window to edit contact with id: " + id)
    }
      else if(type === "deleteContact"){
      console.log('Opened dialog window for delete contact with id: ' + id);
    } else return
  }

  /**
  * Opens the contact detail view with a smooth transition effect.
  * If a contact is already displayed, it triggers an exit animation, waits for its completion,
  * then fetches new contact data from the database and triggers an entry animation.
  * * @param {number} id - The unique identifier of the contact to be displayed.
  * @returns {Promise<void>} A promise that resolves once the animations are sequenced
  * and the new data is rendered.
  */
  async openDetailDialogWindow(id: number) {
    if (this.isVisible()) {
      this.isVisible.set(false);
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    this.selectedContactId.set(id);
    const data = await this.dbService.getContactById(id);
    if (data) {
      this.selectedContactData.set(data);
      this.isVisible.set(true);
    }
  }

  /**
  * Closes the contact detail view by resetting the selection states.
  * Clears both the selected ID and the contact data signals to hide the UI elements.
  * * @returns {void}
  */
  closeDetailView() {
    this.selectedContactData.set(null);
    this.selectedContactId.set(null);
  }

}
