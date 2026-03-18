import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { FullTask } from '../../../interfaces/task.interface.js';
import { ContactService } from '../../../services/contact-service.ts.js';
import { TasksService } from '../../../services/tasks-service.js';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-board-card',
  imports: [DragDropModule, CommonModule],
  templateUrl: './board-card.html',
  styleUrl: './board-card.scss',
})
export class BoardCard {

  @Input({ required: true }) task!: FullTask;
  @Input({ required: true }) activeDropdownId: number | null = null;

  @Output() openDetails = new EventEmitter<FullTask>();
  @Output() toggleMenu = new EventEmitter<number>();
  @Output() menuClosed = new EventEmitter<void>();

  taskService = inject(TasksService);
  contactService = inject(ContactService);

}
