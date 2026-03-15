import { Component, inject, signal, computed, HostListener, output, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { Supabase } from '../../services/supabase';
import { FullTask, Task, TaskCategory, TaskFormData, TaskPriority } from '../../interfaces/task.interface';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { ContactService } from '../../services/contact-service.ts';
import { TasksService } from '../../services/tasks-service';
import { OAuthService } from '../../services/o-auth-service';

@Component({
  selector: 'app-add-task',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-task.html',
  styleUrl: './add-task.scss',
})

export class AddTask implements OnInit {
  public fb = inject(FormBuilder);
  public dbService = inject(Supabase);
  contactService = inject(ContactService);
  taskService = inject(TasksService);
  oAuthService = inject(OAuthService);
  public router = inject(Router);
  public route = inject(ActivatedRoute);
  minDate = new Date().toISOString().split('T')[0];
  taskForm: FormGroup;
  selectedPriority = signal<TaskPriority>('Medium');
  public isContactListVisible = signal<boolean>(false);
  searchContactName = signal<string>('');
  isCategoryListVisible = signal<boolean>(false);
  isSubtaskActive = signal<boolean>(false);
  taskCreated = output<void>();
  private _initialStatus: string = 'ToDo';

  /**
  * Initializes the component and sets up the reactive task form.
  * The form includes validation for mandatory fields (title, due_date, category)
  * and manages complex data structures like the assigned contacts array
  * and a FormArray for subtasks.
  */
  constructor() {
    this.taskForm = this.fb.group({
      title: ['', [Validators.required]],
      description: [''],
      due_date: ['', [Validators.required]],
      category: ['', [Validators.required]],
      assigned_to: [[]],
      subtaskInput: [''],
      subtasks: this.fb.array([])
    });
  }

  /**
  * Sets the initial workflow status for a new task.
  * This setter ensures that a task always has a valid status. If the provided
  * value is undefined, it defaults to 'ToDo'. It also triggers the form
  * update logic if the form has already been initialized.
  * @param value - The target status (e.g., 'ToDo', 'In Progress') or undefined.
  */
  @Input() set initialStatus(value: string | undefined) {
    this._initialStatus = value || 'ToDo';
    if (this.taskForm) {
      this.applyInitialStatus();
    }
  }

  /**
  * Holds the data of an existing task when the component is used in edit mode.
  * If provided, this object is used to pre-populate the form fields,
  * task assignments, and subtasks.
  */
  @Input() editTaskData: FullTask | null = null;

  /**
  * Returns the current initial status assigned to the task.
  * @returns {string} The workflow status string.
  */
  get initialStatus(): string {
    return this._initialStatus;
  }

  /**
  * Lifecycle hook that initializes the component.
  * Fetches contacts and determines if the form should be pre-filled for editing
  * or initialized with a specific status from Input or Query Parameters.
  */
  ngOnInit() {
    if (this.oAuthService.logingStatus() === 'nobody' && !this.editTaskData) {
      this.router.navigate(['/']);
    }
    this.contactService.getContacts();
    if (this.editTaskData) {
      this.fillFormForEdit(this.editTaskData);
    } else {
      this.applyInitialStatus();
    }
  }

  /**
  * Populates the task form and internal signals with data from an existing task.
  * This method maps core task properties to form controls, synchronizes the
  * priority signal, and reconstructs the subtasks FormArray. It also extracts
  * contact IDs from task assignments to initialize the assigned users field.
  * @param {FullTask} task - The complete task object containing details,
  * assignments, and subtasks to be loaded into the edit mode.
  * @private
  */
  private fillFormForEdit(task: FullTask) {
    this.taskForm.patchValue({
        title: task.title,
        description: task.description,
        due_date: task.due_date,
        priority: task.priority,
        category: task.category,
        assigned_to: task.task_assignments?.map(a => a.contacts.id) || []
      });
    this.selectedPriority.set(task.priority);
    if (task.subtasks) {
      this.subtaskArray.clear();
      task.subtasks.forEach(sub => {
        this.subtaskArray.push(this.fb.group({
          id: [sub.id],
          title: [sub.title],
          is_done: [sub.is_done]
        }));
      });
    }
  }

  /**
  * Checks for status in Inputs or URL Query Params and applies it to the form.
  */
  applyInitialStatus(){
    const STATUS_FROM_URL = this.route.snapshot.queryParamMap.get('status');
    const FINAL_STATUS = this.initialStatus || STATUS_FROM_URL || 'ToDo';
    if (!this.taskForm.contains('status')) {
      this.taskForm.addControl('status', this.fb.control(FINAL_STATUS));
    } else {
      this.taskForm.get('status')?.setValue(FINAL_STATUS);
    }
  }

  /**
  * Getter that provides easy access to the 'subtasks' FormArray
  * within the reactive task form.
  * @returns {FormArray} The FormArray containing subtask form controls.
  */
  get subtaskArray() {
    return this.taskForm.get('subtasks') as FormArray;
  }

  /**
  * Updates the current task priority level.
  * @param {TaskPriority} prio - The priority level to be set (e.g., 'Urgent', 'Medium', 'Low').
  */
  setPriority(prio: TaskPriority) {
    this.selectedPriority.set(prio);
  }

  /**
  * Adds a new subtask to the subtask form array.
  * Extracts the current value from the 'subtaskInput' field, validates that it contains
  * non-whitespace characters, pushes a new FormGroup into the 'subtasks' array,
  * and subsequently invokes 'clearSubtask()' to reset the input field.
  */
  async addSubtask() {
    const VALUE = this.taskForm.get('subtaskInput')?.value;
    if (VALUE && VALUE.trim()) {
      this.subtaskArray.push(this.fb.group({ title: [VALUE] }));
      this.clearSubtask();
    }
  }

  /**
  * Clears the current value of the subtask input field.
  * This method resets the 'subtaskInput' form control to an empty string,
  * typically used when the user cancels the current typing or after
  * a subtask has been successfully added.
  */
  clearSubtask(){
    this.taskForm.get('subtaskInput')?.setValue('');
    this.isSubtaskActive.set(false);
  }

  /**
  * Sets the subtask input to active mode.
  */
  setSubtaskActive(active: boolean) {
    this.isSubtaskActive.set(active);
  }

  /**
  * Removes a subtask from the form array at a specific position.
  * @param {number} index - The index of the subtask element to be removed from the array.
  */
  removeSubtask(index: number) {
    this.subtaskArray.removeAt(index);
  }

  /**
  * Resets the entire task form to its initial state.
  * Clears all input fields, empties the subtask array, initializes
  * 'assigned_to' as an empty list, and restores the default 'Medium' priority.
  */
  formClear(){
    this.taskForm.reset({ assigned_to: [], subtasks: [] });
    this.subtaskArray.clear();
    this.selectedPriority.set('Medium');
  }

  /**
  * Orchestrates the task creation process.
  * Validates the form, extracts and prepares the data, and attempts to save the task
  * to the database via the database service. Handles success and error states accordingly.
  * @returns {Promise<void>} A promise that resolves when the task creation process is complete.
  */
  async addTask() {
    if (this.taskForm.invalid){
      this.taskForm.markAllAsTouched();
      return;
    }
    const taskData = this.prepareTaskData();
    const assignedTo = this.taskForm.value.assigned_to;
    const subtasks = this.taskForm.value.subtasks;
    try {
      await this.taskService.createTask(taskData, assignedTo, subtasks);
      this.handleSuccess();
    } catch (error) {
      this.dbService.showNotification('Failed to create task.');
    }
  }

  /** Prepares the main task object from the form and signals.
  * Extracts values from the reactive form and combines them with the priority signal.
  * @returns {TaskFormData} The prepared data object ready for database insertion.
  * @private
  */
  private prepareTaskData(): TaskFormData {
    const FORM_VALUE = this.taskForm.value;
    return {
      title: FORM_VALUE.title,
      description: FORM_VALUE.description,
      due_date: FORM_VALUE.due_date,
      category: FORM_VALUE.category,
      priority: this.selectedPriority(),
      status: FORM_VALUE.status || 'ToDo'
    };
  }

  /** Logic to execute after successful task creation */
  private handleSuccess() {
    this.formClear();
    this.dbService.showNotification('Task successfully created!');
    this.taskCreated.emit();
    setTimeout(() => {
      this.router.navigate(['/board']);
    }, 1500);
  }

  /**
  * Retrieves the initials of a contact based on their unique identifier.
  * Searches the synchronized contacts list and uses the database service
  * to format the initials.
  * @param {number} id - The unique ID of the contact.
  * @returns {string} The contact's initials or an empty string if not found.
  */
  getContactInitials(id: number): string {
    const CONTACT = this.contactService.contacts().find(contact => contact.id === id);
    return CONTACT ? this.contactService.getInitials(CONTACT.name) : '';
  }

  /**
  * Retrieves the specific theme color associated with a contact.
  * @param {number} id - The unique ID of the contact.
  * @returns {string} The HEX color string or a default gray fallback ('#ccc').
  */
  getContactColor(id: number): string {
    const CONTACT = this.contactService.contacts().find(contact => contact.id === id);
    return CONTACT?.color || '#ccc';
  }

  /**
  * Toggles the visibility of the contact selection dropdown.
  * When opening the list, it automatically resets the search filter to ensure
  * the full list of contacts is displayed.
  */
  toggleContactList() {
    this.isContactListVisible.update(visible => !visible);
    if (this.isContactListVisible()) {
      this.searchContactName.set('');
    }
  }

  /**
  * Global document click listener that manages the automatic closure of custom dropdown menus.
  * It checks the click target and toggles the visibility signals for both the
  * contact assignment list and the category selection list. If a click occurs
  * outside their respective parent containers, the dropdowns are closed.
  * @param {MouseEvent} event - The native browser mouse event triggered by the user.
  */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const TARGET = event.target as HTMLElement;
    if (!TARGET.closest('#category-select')) {
      this.isCategoryListVisible.set(false);
    }
    if (!TARGET.closest('#assign-contacts')) {
      this.isContactListVisible.set(false);
    }
  }

  /**
  * Toggles the selection state of a contact within the form.
  * If the contact is already assigned, it removes them from the array;
  * otherwise, it adds them. This method updates the reactive form control
  * using an immutable array spread approach.
  * @param {number} contactId - The unique identifier of the contact to toggle.
  */
  toggleContactSelection(contactId: number) {
    const CONTROL = this.taskForm.get('assigned_to');
    const CURRENT_VAL: number[] = CONTROL?.value || [];

    if (CURRENT_VAL.includes(contactId)) {
      CONTROL?.setValue(CURRENT_VAL.filter(id => id !== contactId));
    } else {
      CONTROL?.setValue([...CURRENT_VAL, contactId]);
    }
  }

  /**
  * A reactive signal that returns a filtered list of contacts based on the current search term.
  * It automatically re-evaluates whenever 'searchContactName' or the global
  * contacts list changes, ensuring efficient memory-based filtering.
  * @returns {Contact[]} The list of contacts matching the search criteria.
  */
  filteredContacts = computed(() => {
    const TERM = this.searchContactName().toLowerCase().trim();
    if (!TERM) return this.contactService.contacts();

    return this.contactService.contacts().filter(contact =>
      contact.name.toLowerCase().includes(TERM)
    );
  });

  /**
  * Handles the input event from the contact search field.
  * Updates the search term signal and ensures the contact dropdown list
  * is visible to show filtered results.
  * @param {Event} event - The input event containing the search string.
  */
  onSearchChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchContactName.set(input.value);
    this.isContactListVisible.set(true);
  }

  /**
  * Checks if a specific contact is currently selected in the reactive form.
  * Used primarily for UI styling and displaying custom checkmark icons.
  * @param {number} contactId - The unique ID of the contact to check.
  * @returns {boolean} True if the contact is in the 'assigned_to' array.
  */
  isContactSelected(contactId: number): boolean {
    const selectedIds: number[] = this.taskForm.get('assigned_to')?.value || [];
    return selectedIds.includes(contactId);
  }

  /**
  * Toggles the visibility of the category dropdown list.
  */
  toggleCategoryList() {
    this.isCategoryListVisible.update(visible => !visible);
  }

  /**
  * Sets the selected category in the reactive form and closes the dropdown.
  * @param {string} category - The name of the selected category.
  */
  selectCategory(category: TaskCategory) {
    this.taskForm.get('category')?.setValue(category);
    this.isCategoryListVisible.set(false);
  }

  /**
  * Orchestrates the complete task update workflow.
  * This method validates the form, extracts raw data (ensuring IDs of subtasks
  * are preserved), merges it with the current task's metadata, and triggers
  * a full database synchronization through the Supabase service.
  * On success, it notifies the parent component to refresh the UI.
  * @returns {Promise<void>} Resolves when the update is complete or fails silently if form is invalid.
  * Show a notification if the database service call fails.
  */
  async updateTask(){
    if (this.taskForm.invalid || !this.editTaskData) return;
    const rawForm = this.taskForm.getRawValue();
    const taskToUpdate: Task = {
      ...this.prepareTaskData(),
      id: this.editTaskData.id,
      status: this.editTaskData.status
    };
    try {
      await this.taskService.updateFullTask(taskToUpdate, rawForm.assigned_to, rawForm.subtasks);
      this.taskCreated.emit();
    } catch (error) {
      this.dbService.showNotification("Task update failed.");
    }
  }
}
