import { Component, inject, signal, computed, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { Supabase } from '../../services/supabase';
import { Task, TaskFormData, TaskPriority } from '../../interfaces/task.interface';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-add-task',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-task.html',
  styleUrl: './add-task.scss',
})

export class AddTask {
  public fb = inject(FormBuilder);
  public dbService = inject(Supabase);
  minDate = new Date().toISOString().split('T')[0];
  taskForm: FormGroup;
  selectedPriority = signal<TaskPriority>('Medium');
  public isContactListVisible = signal<boolean>(false);
  searchContactName = signal<string>('');

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

  ngOnInit() {
    this.dbService.getContacts();
  }

  get subtaskArray() {
    return this.taskForm.get('subtasks') as FormArray;
  }

  setPriority(prio: TaskPriority) {
    this.selectedPriority.set(prio);
    console.log(prio);
  }

  addSubtask() {
    const VALUE = this.taskForm.get('subtaskInput')?.value;
    if (VALUE && VALUE.trim()) {
      this.subtaskArray.push(this.fb.group({ title: [VALUE] }));
      this.taskForm.get('subtaskInput')?.setValue('');
    }
  }

  removeSubtask(index: number) {
    this.subtaskArray.removeAt(index);
  }

  formClear(){
    this.taskForm.reset({ assigned_to: [], subtasks: [] });
    this.subtaskArray.clear();
    this.selectedPriority.set('Medium');
  }

  async addTask(){
    if (this.taskForm.valid) {
      const FORM_VALUE = this.taskForm.value;

      const taskData:TaskFormData = {
        title: FORM_VALUE.title,
        description: FORM_VALUE.description,
        due_date: FORM_VALUE.due_date,
        category: FORM_VALUE.category,
        priority: this.selectedPriority(),
        status: "ToDo"
      };

      try {
        await this.dbService.createTask(
          taskData,
          FORM_VALUE.assigned_to,
          FORM_VALUE.subtasks
        );
        this.formClear();
        console.log("Tutaj możesz dodać np. zamknięcie dialogu lub nawigację");
      } catch (error) {
        console.error('Failed to create task:', error);
      }
    }
  }

  getContactInitials(id: number): string {
    const CONTACT = this.dbService.contacts().find(contact => contact.id === id);
    return CONTACT ? this.dbService.getInitials(CONTACT.name) : '';
  }

  getContactColor(id: number): string {
    const CONTACT = this.dbService.contacts().find(contact => contact.id === id);
    return CONTACT?.color || '#ccc';
  }

  toggleContactList() {
    this.isContactListVisible.update(v => !v);
    if (this.isContactListVisible()) {
      this.searchContactName.set('');
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('#assign-contacts')) {
      this.isContactListVisible.set(false);
    }
  }

  toggleContactSelection(contactId: number) {
    const control = this.taskForm.get('assigned_to');
    const currentValues: number[] = control?.value || [];

    if (currentValues.includes(contactId)) {
      control?.setValue(currentValues.filter(id => id !== contactId));
    } else {
      control?.setValue([...currentValues, contactId]);
    }
  }

  filteredContacts = computed(() => {
    const term = this.searchContactName().toLowerCase().trim();
    if (!term) return this.dbService.contacts();

    return this.dbService.contacts().filter(contact =>
      contact.name.toLowerCase().includes(term)
    );
  });

  onSearchChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchContactName.set(input.value);
    this.isContactListVisible.set(true);
  }
}
