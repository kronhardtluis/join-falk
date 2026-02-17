import { Component } from '@angular/core';
import { inject, signal } from '@angular/core';
import { Supabase } from '../../services/supabase';

@Component({
  selector: 'app-contact',
  imports: [],
  templateUrl: './contact.html',
  styleUrl: './contact.scss',
})
export class Contact {

  public selectedContactId = signal<number | null>(null);

 //Hier binden wir den Datenbankdienst ein.
  dbService = inject(Supabase);
  //Hier laden wir Daten vom Server herunter.
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
    const parts = name.trim().split(/\s+/);
    return parts.length > 1 ? parts[1][0].toUpperCase() : '';
  }

  openAddDialogWindow(){
    console.log('Opened add dialog window');
  }

  openDetailDialogWindow(id: number | undefined){
    console.log("Opened contact detail with id:" + id)
    if(id) this.selectedContactId.set(id);
  }

}
