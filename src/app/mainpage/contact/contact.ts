import { Component, ElementRef, ViewChild } from '@angular/core';
import { inject, signal, OnInit } from '@angular/core';
import { Supabase } from '../../services/supabase';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HostListener } from '@angular/core';

interface ContactData {
  id: number;
  name: string;
  email: string;
  phone: string;
  color: string;
}

@Component({
  selector: 'app-contact',
  imports: [ReactiveFormsModule],
  templateUrl: './contact.html',
  styleUrl: './contact.scss',
})
export class Contact implements OnInit {
  @ViewChild('contactDialog') dialog!: ElementRef<HTMLDialogElement>;

  public selectedContactId = signal<number | null>(null);
  public selectedContactData = signal<ContactData | null>(null);
  public isVisible = signal(false);
  public isEditMode = signal(false);
  public isMobileMenuOpen = signal(false);
  dbService = inject(Supabase);
  private fb = inject(FormBuilder);
  public userForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3), Validators.pattern(/^[a-zA-Z]+\s+[a-zA-Z]+.*$/)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^[0-9+ ]{9,15}$/)]]
  });

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
      this.isEditMode.set(false);
      this.userForm.reset();
      this.dialog.nativeElement.showModal();
      console.log("Opened dialog window for add new contact. ID will be ignored.")
    } else if(type === "editContact") {
      this.isEditMode.set(true);
      this.prepareEditForm(id);
      this.dialog.nativeElement.showModal();
      console.log("Opened dialog window to edit contact with id: " + id)
    }
      else if(type === "deleteContact"){
      this.handleDelete(id);
      console.log('Opened dialog window for delete contact with id: ' + id);
    } else return
  }

  private prepareEditForm(id?: number) {
    if (!id) return;
    const contact = this.dbService.contacts().find(contact => contact.id === id);
    if (contact) {
      this.userForm.patchValue(contact);
    }
  }

  closeDialog() {
    this.dialog.nativeElement.close();
  }

  async handleDelete(id?: number) {
    if (!id) return;
    if (confirm('Are you sure you want to delete this contact?')) {
      this.closeDetailView();
    }
  }

  async formSubmit(){
    if (this.userForm.invalid) return;
    const formData = this.userForm.value;
    try {
      if (this.isEditMode()) {
        const id = this.selectedContactId();
        if (id) {
          await this.dbService.updateContact(id, formData);
        }
      } else {
        const newContact = {
          ...formData,
          color: this.getRandomColor()
        };
        await this.dbService.addContact(newContact);
      }
      this.userForm.reset();
      this.closeDialog();
    } catch (error) {
      console.error('Error handling form submission:', error);
    }
  }

  getRandomColor():string{
    const colors = [
    '#FF7A00', '#FF5EB3', '#6E52FF', '#9327FF',
    '#00BEE8', '#1FD7C1', '#FFBB2B', '#462F8A',
    '#FF4646', '#0038FF'
    ];
    const randomIndex = Math.floor(Math.random() * colors.length);
    return colors[randomIndex];
  }

  onBackdropClick(event: MouseEvent) {
    const DIALOG_ELEMENT = this.dialog.nativeElement;
    const RECT = DIALOG_ELEMENT.getBoundingClientRect();
    const IS_CLICK_OUTSIDE = (
      event.clientX < RECT.left ||
      event.clientX > RECT.right ||
      event.clientY < RECT.top ||
      event.clientY > RECT.bottom
    );
    if (IS_CLICK_OUTSIDE) {
      this.closeDialog();
      this.isMobileMenuOpen.set(false);
    }
  }

  /**
  * Opens the contact detail view with a smooth transition effect.
  * If a contact is already displayed, it triggers an exit animation, waits for its completion,
  * then fetches new contact data from the database and triggers an entry animation.
  * * @param {number} id - The unique identifier of the contact to be displayed.
  * @returns {Promise<void>} A promise that resolves once the animations are sequenced
  * and the new data is rendered.
  */
  async openDetailWindow(id: number) {
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
  * Closes the contact detail view.
  * @param {boolean} keepSelection - If true, the selectedContactId remains set (useful for mobile back navigation).
  */
  closeDetailView(keepSelection: boolean = false) {
    this.isVisible.set(false);
    setTimeout(() => {
      this.selectedContactData.set(null);
      if (!keepSelection) {
        this.selectedContactId.set(null);
      }
    }, 200);
  }


  toggleMobileMenu(event: Event) {
    event.stopPropagation();
    event.preventDefault();
    this.isMobileMenuOpen.update(v => !v);
  }

  handleMobileAction(type: 'editContact' | 'deleteContact') {
    const ID = this.selectedContactId();
    if (ID) {
      this.openDialogWindow(type, ID);
      this.isMobileMenuOpen.set(false);
    }
  }

  @HostListener('document:click', ['$event'])
  clickOutsideMenu(event: Event) {
    const clickedElement = event.target as HTMLElement;
    if (this.isMobileMenuOpen() && !clickedElement.closest('.mobile-menu-container')) {
      this.isMobileMenuOpen.set(false);
    }
  }
}

