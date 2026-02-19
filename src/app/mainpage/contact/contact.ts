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

  dbService = inject(Supabase);


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


  openAddDialogWindow(){
    console.log('Opened add dialog window');
  }


  async openDetailDialogWindow(id: number) {
    this.selectedContactId.set(id);
    const DATA = await this.dbService.getContactById(id);
    if (DATA) {
      this.selectedContactData.set(DATA);
    }
  }


  closeDetailView() {
    this.selectedContactData.set(null);
    this.selectedContactId.set(null);
  }

}
