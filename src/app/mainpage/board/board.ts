import {
  Component,
  ViewChild,
  ElementRef,
  inject,
  HostListener,
  signal,
  computed,
} from '@angular/core';
import { AddTask } from '../add-task/add-task';
import { Supabase } from '../../services/supabase';
import { FullTask } from '../../interfaces/task.interface';
import { RouterLink, Router } from '@angular/router';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { ContactService } from '../../services/contact-service.ts';
import { TasksService } from '../../services/tasks-service';
import { OAuthService } from '../../services/o-auth-service';
import { BoardCard } from './board-card/board-card';


@Component({
  selector: 'app-board',
  standalone: true,
  imports: [AddTask, RouterLink, DragDropModule, BoardCard],
  templateUrl: './board.html',
  styleUrl: './board.scss',
})
export class Board {
  dbService = inject(Supabase);
  contactService = inject(ContactService);
  taskService = inject(TasksService);
  oAuthService = inject(OAuthService);
  isTaskEditMode = signal<boolean>(false);
  searchQuery = signal<string>('');
  todoTasksFiltred = computed(() => this.filteredTasks().filter((task) => task.status === 'ToDo').sort((a, b) => (a.position ?? 0) - (b.position ?? 0)));
  inProgressTasksFiltred = computed(() =>
    this.filteredTasks().filter((task) => task.status === 'In Progress').sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
  );
  awaitingFeedbackTasksFiltred = computed(() =>
    this.filteredTasks().filter((task) => task.status === 'Awaiting Feedback').sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
  );
  doneTasksFiltred = computed(() => this.filteredTasks().filter((task) => task.status === 'Done').sort((a, b) => (a.position ?? 0) - (b.position ?? 0)));
  activeDropdownId = signal<number | null>(null);
  router = inject(Router);
  orientation: 'horizontal' | 'vertical' = 'vertical';
  dragDisabled = false;
  currentColumnStatus = signal<string>('ToDo');

  /**
  * Initializes the component by fetching initial board data and
  * setting up real-time database subscriptions.
  * Part of the Angular Lifecycle hook.
  */
  ngOnInit() {
    if (this.oAuthService.logingStatus() === 'nobody') {
      this.router.navigate(['/']);
    }
    this.taskService.loadBoardData();
    this.onResize();
  }

  /**
  * Reference to the native HTML dialog element used for displaying task details.
  * Injected via ViewChild after the view is initialized.
  */
  @ViewChild('taskDetailDialog') taskDetailDialog!: ElementRef<HTMLDialogElement>;

  /**
  * Opens the task detail modal and populates it with the provided task data.
  * Updates the global state via the dbService signal to trigger the detail view rendering.
  * @param task - The full task object (including subtasks and assignments) to be displayed.
  */
  openTaskDetails(task: FullTask) {
    this.taskService.selectedTask.set(task);
    this.taskDetailDialog.nativeElement.showModal();
  }

  /**
  * Closes the task detail modal and clears the selected task from the global state.
  * Resets the dbService signal to null to prevent stale data on next opening.
  */
  closeTaskDetails() {
    const DIALOG_ELEMENT = this.taskDetailDialog.nativeElement;
    DIALOG_ELEMENT.classList.add('closing');
    setTimeout(() => {
      DIALOG_ELEMENT.close();
      DIALOG_ELEMENT.classList.remove('closing');
      this.taskService.selectedTask.set(null);
      this.isTaskEditMode.set(false);
    }, 400);
  }

  @ViewChild('dialog') dialog!: ElementRef<HTMLDialogElement>;

  /**
  * Navigates to the add-task page on mobile or opens the creation dialog on desktop.
  * @param status The status of the column where the plus was clicked.
  */
  open(status: string = 'ToDo') {
    this.currentColumnStatus.set(status);
    if (window.innerWidth > 640) {
      this.dialog.nativeElement.showModal();
    } else {
      this.router.navigate(['/add-task']);
    }
  }

  /**
  * Closes the task creation dialog.
  */
  close() {
    const DIALOG_ELEMENT = this.dialog.nativeElement;
    DIALOG_ELEMENT.classList.add('closing');
    setTimeout(() => {
      DIALOG_ELEMENT.close();
      DIALOG_ELEMENT.classList.remove('closing');
    }, 400);
  }

  /**
  * Handles click events on the dialog backdrop to close the modal.
  * Logic differentiates between the task detail view and the general task creation dialog.
  * @param event - The native MouseEvent triggered by the click.
  * @param dialogTarget - Optional identifier to specify which dialog is being targeted (e.g., 'taskDetailDialog').
  * @returns void
  */
  checkClickOutside(event: MouseEvent, dialogTarget?: string) {
    if (dialogTarget === 'taskDetailDialog') {
      this.closeTaskDetails();
    }
    if (event.target === this.dialog.nativeElement) {
      this.close();
    }
  }

  /**
  * A computed signal that reactively filters the global task list.
  * It combines the current search query and the raw task data from the database service.
  * The filter is case-insensitive and checks for matches in both the task title and description.
  * If the search query is empty, it returns the full list of tasks.
  * @returns {Signal<FullTask[]>} A memoized list of tasks matching the search criteria.
  */
  filteredTasks = computed(() => {
    const QUERY = this.searchQuery().toLowerCase().trim();
    const ALL_TASKS = this.taskService.tasks();
    if (!QUERY) return ALL_TASKS;
    return ALL_TASKS.filter(
      (task) =>
        task.title.toLowerCase().includes(QUERY) || task.description?.toLowerCase().includes(QUERY),
    );
  });

  /**
  * Updates the search query signal based on user input.
  * This method is triggered by the input event in the search field,
  * effectively driving the reactive updates of the 'filteredTasks' signal.
  * @param event - The native DOM event from the search input element.
  */
  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  /**
  * Triggers the deletion of a task after user confirmation.
  * Closes the detail dialog upon success.
  * @param taskId - The ID of the task to be deleted.
  */
  async deleteTask(taskId: number | undefined) {
    if (taskId === undefined) return;
    try {
      await this.taskService.deleteTask(taskId);
      this.closeTaskDetails();
      this.dbService.showNotification('Task deleted.');
    } catch (err) {
      this.dbService.showNotification('Delete failed: ' + err);
    }
  }

  /**
  * Handles the dropping of a task card using Angular CDK Drag and Drop.
  * Manages the UI transition between columns and triggers the database update with a new calculated position.
  * @param event - The CdkDragDrop event containing task data and container references.
  */
  drop(event: CdkDragDrop<FullTask[]>) {
    const TASK = event.item.data as FullTask;
    const TARGET_ARRAY = event.container.data;
    if (event.previousContainer === event.container) {
      moveItemInArray(TARGET_ARRAY, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        TARGET_ARRAY,
        event.previousIndex,
        event.currentIndex
      );
    }
    const NEW_POSITION = this.calculateNewPosition(TARGET_ARRAY, event.currentIndex);
    const NEW_STATUS = event.container.id;
    this.taskService.updateTaskStatus(TASK.id!, NEW_STATUS, NEW_POSITION);
  }

  /**
  * Calculates a new position value for a task based on its neighbors in the target array.
  * Uses a midpoint strategy to allow insertions between existing tasks without reindexing the whole list.
  * @param targetArray - The array where the task was dropped.
  * @param currentIndex - The new index of the task within the target array.
  * @returns {number} The calculated position value for database synchronization.
  * @private
  */
  private calculateNewPosition(targetArray: FullTask[], currentIndex: number): number {
    const PREV_TASK = targetArray[currentIndex - 1];
    const NEXT_TASK = targetArray[currentIndex + 1];
    const PREV_POS = PREV_TASK?.position ?? 0;
    const NEXT_POS = NEXT_TASK?.position ?? 0;
    let newPos: number;
    if (!PREV_TASK && !NEXT_TASK) {
      newPos = 1000;
    } else if (!PREV_TASK) {
      newPos = Math.round(NEXT_POS / 2);
    } else if (!NEXT_TASK) {
      newPos = PREV_POS + 1000;
    } else {
      newPos = Math.round((PREV_POS + NEXT_POS) / 2);
    }
    return isNaN(newPos) ? 1000 : newPos;
  }

  /**
  * Handles the dropping of a task card using Angular CDK Drag and Drop.
  * If the task is moved to a different container (column), it triggers a status update in the database.
  * If moved within the same container, it reorders the tasks locally in the array.
  * @param event - The CdkDragDrop event containing data about the dragged item and target container.
  */
  toggleMenu(taskId:number) {
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
  * Manages UI state changes based on window resize events.
  * Handles drag-and-drop orientation, disables dragging on mobile,
  * and closes open dialogs or dropdowns when switching view modes.
  */
  @HostListener('window:resize')
  onResize(){
    const WIDTH = window.innerWidth;
    this.orientation = WIDTH > 1200 ? 'vertical' : 'horizontal';
    this.dragDisabled = WIDTH <= 1200;
    if (WIDTH < 640 && this.dialog?.nativeElement.open) this.close();
    if (WIDTH > 640) this.closeMenu();
  }

  /**
  * Handles document-wide click events to close interactive elements like
  * dropdown menus when a user clicks outside of them.
  * @param event - The native MouseEvent.
  */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const TARGET = event.target as HTMLElement;
    const IS_DROPDOWN_CLICK = TARGET.closest('.dropdown-button') || TARGET.closest('.dropdown');
    if (!IS_DROPDOWN_CLICK) {
      this.closeMenu();
    }
  }
}
