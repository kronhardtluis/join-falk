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

interface FormData {
  id?: number;
  name: string;
  email: string;
  phone: string;
  color?: string;
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
  * Orchestrates the opening of dialog windows and triggers the contact deletion process.
  * Depending on the 'type', it prepares the form for adding/editing or executes deletion.
  * * @param {'addContact' | 'editContact' | 'deleteContact'} type - The action type to perform.
  * @param {number} [id] - Optional contact identifier (required for 'editContact').
  * @returns {void}
  */
  openDialogWindow(type:'addContact' | 'editContact' | 'deleteContact', id?:number){
    if(type === "addContact"){
      this.isEditMode.set(false);
      this.userForm.reset();
      this.dialog.nativeElement.showModal();
    } else if(type === "editContact") {
      this.isEditMode.set(true);
      this.prepareEditForm(id);
      this.dialog.nativeElement.showModal();
    }
      else if(type === "deleteContact"){
      this.handleDelete();
    } else return
  }

  /**
  * Populates the form with existing contact data to prepare for editing.
  * It searches for the contact by ID within the local state and updates
  * the form controls using patchValue.
  * * @private
  * @param {number} [id] - The unique identifier of the contact to be edited.
  * @returns {void}
  */
  private prepareEditForm(id?: number) {
    if (!id) return;
    const contact = this.dbService.contacts().find(contact => contact.id === id);
    if (contact) {
      this.userForm.patchValue(contact);
    }
  }

  /**
  * Closes the contact dialog window using the native HTML dialog API.
  * This method resets the visual state of the modal without necessarily
  * clearing the form data.
  * * @returns {void}
  */
  closeDialog() {
    this.dialog.nativeElement.close();
  }

  /**
  * Handles the contact deletion process.
  * If a contact ID is selected, it calls the database service to remove the record,
  * closes active UI views (details and dialog), and displays a success notification.
  * * @async
  * @private
  * @returns {Promise<void>} Resolves when the deletion and UI updates are complete.
  */
  async handleDelete() {
   const id = this.selectedContactId();
    if (id) {
      try {
        await this.dbService.deleteContact(id);
        this.closeDetailView();
        this.closeDialog();
        this.showNotification('Contact succesfully deleted.');
      } catch (error) {
      console.error('Error deleting contact:', error);
      }
    }
  }

  /**
  * Main form submission handler. Validates the form, processes the data,
  * and handles UI finalization or error reporting.
  * * @returns {Promise<void>}
  */
  async formSubmit(){
    if (this.userForm.invalid) return;
    try {
      await this.processContactData();
      this.finalizeForm();
      this.showNotification(this.isEditMode() ? 'Contact succesfully saved.' : 'Contact succesfully created.');
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
  * Determines whether to create a new contact or update an existing one
  * based on the current component state.
  * * @private
  * @returns {Promise<void>}
  */
  private async processContactData() {
    const formData = this.userForm.value;
    if (this.isEditMode()) {
      await this.updateExistingContact(formData);
    } else {
      await this.createNewContact(formData);
    }
  }

  /**
  * Updates an existing contact record in the database using the selected ID.
  * * @private
  * @param {FormData} formData - The validated data from userForm.
  * @throws {Error} If no contact ID is selected for the update.
  * @returns {Promise<void>}
  */
  private async updateExistingContact(formData: FormData) {
    const id = this.selectedContactId();
    if (!id) throw new Error('No contact ID selected for update');
      await this.dbService.updateContact(id, formData);
  }

  /**
  * Assigns a random color to new contact data and sends it to the database service.
  * * @private
  * @param {FormData} formData - The validated data from userForm.
  * @returns {Promise<void>}
  */
  private async createNewContact(formData: FormData) {
    const newContact = {
      ...formData,
      color: this.getRandomColor()
    };
    await this.dbService.addContact(newContact);
  }

  /**
  * Cleans up the UI by resetting the form state and closing the active dialog.
  * * @private
  * @returns {void}
  */
  private finalizeForm() {
    this.userForm.reset();
    this.closeDialog();
  }

  /**
  * Centralized error handler for form submission failures.
  * Logs the provided error to the console for debugging purposes.
  * * @private
  * @param {unknown} error - The error object or message captured during the submission process.
  * @returns {void}
  */
  private handleError(error: unknown) {
    console.error('Form submission failed:', error);
  }

  /**
  * Displays a temporary toast notification message on the screen.
  * * @param {string} message - The text content to display in the toast.
  * @returns {void}
  */
  showNotification(message:string){
    console.log(message);
    ////to do ...
  }

  /**
  * Selects a random hex color code from a predefined professional color palette.
  * These colors are intended to be used as background colors for contact avatars.
  * * @returns {string} A string representing a hex color code (e.g., '#FF7A00').
  */
  getRandomColor():string{
    const colors = [
    '#FF7A00', '#FF5EB3', '#6E52FF', '#9327FF',
    '#00BEE8', '#1FD7C1', '#FFBB2B', '#462F8A',
    '#FF4646', '#0038FF'
    ];
    const randomIndex = Math.floor(Math.random() * colors.length);
    return colors[randomIndex];
  }

  /**
  * Detects clicks on the dialog's backdrop and closes the UI components accordingly.
  * It calculates the bounding box of the dialog and compares it with the mouse click
  * coordinates to determine if the click occurred outside the dialog's boundaries.
  * * @param {MouseEvent} event - The mouse event triggered by clicking.
  * @returns {void}
  */
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

  /**
  * Toggles the visibility state of the mobile menu.
  * It prevents the event from bubbling up to parent elements and stops default
  * browser behavior to ensure a clean UI transition.
  * * @param {Event} event - The trigger event (e.g., click or touch).
  * @returns {void}
  */
  toggleMobileMenu(event: Event) {
    event.stopPropagation();
    event.preventDefault();
    this.isMobileMenuOpen.update(v => !v);
  }

  /**
  * Executes contact actions (edit or delete) specifically from the mobile interface.
  * It retrieves the currently selected contact ID, triggers the appropriate
  * dialog window, and automatically closes the mobile menu to clean up the UI.
  * * @param {'editContact' | 'deleteContact'} type - The specific action to perform on the selected contact.
  * @returns {void}
  */
  handleMobileAction(type: 'editContact' | 'deleteContact') {
    const ID = this.selectedContactId();
    if (ID) {
      this.openDialogWindow(type, ID);
      this.isMobileMenuOpen.set(false);
    }
  }

  /**
  * Globally listens for click events to detect if the user clicked outside the mobile menu.
  * If the menu is open and the click target is not within the '.mobile-menu-container',
  * the menu is automatically closed.
  * * @param {Event} event - The global document click event.
  * @returns {void}
  */
  @HostListener('document:click', ['$event'])
  clickOutsideMenu(event: Event) {
    const clickedElement = event.target as HTMLElement;
    if (this.isMobileMenuOpen() && !clickedElement.closest('.mobile-menu-container')) {
      this.isMobileMenuOpen.set(false);
    }
  }
}

