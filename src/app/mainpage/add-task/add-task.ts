import { Component, inject, signal, computed } from '@angular/core';
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
  private fb = inject(FormBuilder);
  public dbService = inject(Supabase);
  minDate = new Date().toISOString().split('T')[0];
  taskForm: FormGroup;
  selectedPriority = signal<TaskPriority>('Medium');

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

}
