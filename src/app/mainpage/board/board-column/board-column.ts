import { FullTask } from '../../../interfaces/task.interface';
import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { ContactService } from '../../../services/contact-service.ts';
import { TasksService } from '../../../services/tasks-service';

@Component({
  selector: 'app-board-column',
  imports: [DragDropModule],
  templateUrl: './board-column.html',
  styleUrl: './board-column.scss',
})
export class BoardColumn {
  contactService = inject(ContactService);
  taskService = inject(TasksService);
  @Input() title!: string;
  @Input() columnId!: string;
  @Input() tasks: FullTask[] = [];
  @Input() orientation: 'horizontal' | 'vertical' = 'vertical';
  @Input() dragDisabled = false;
  @Output() openTask = new EventEmitter<FullTask>();
  @Output() addTask = new EventEmitter<string>();
  @Output() dropEvent = new EventEmitter<CdkDragDrop<FullTask[]>>();
  activeDropdownId = signal<number | null>(null);

  /**
  * Toggles the visibility of the mobile "Move to" dropdown menu for a specific task.
  * If the clicked task's menu is already open, it closes it; otherwise, it opens the new one.
  * @param taskId - The unique identifier of the task.
  */
  toggleMenu(taskId: number) {
    this.activeDropdownId.update(id => id === taskId ? null : taskId);
  }

  /**
  * Toggles the visibility of the mobile "Move to" dropdown menu for a specific task.
  * Uses a signal to track the active task ID; if the same task is clicked again, the menu closes.
  * @param taskId - The unique numeric identifier of the task being toggled.
  */
  closeMenu() {
    this.activeDropdownId.set(null);
  }

  /**
  * Updates a task's status and closes the mobile dropdown menu.
  * Acts as a bridge between the component UI and the TasksService.
  * @param taskId - The unique identifier of the task to be moved.
  * @param newStatus - The target board column status (e.g., 'ToDo', 'Done').
  */
  moveTask(taskId: number, newStatus: string) {
    this.taskService.updateTaskStatus(taskId, newStatus);
    this.closeMenu();
  }

}
