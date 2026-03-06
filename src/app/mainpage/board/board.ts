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
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';

interface cardTemplate {
  type: string;
  title: string;
  description: string;
  subtasks: number;
  doneSubtasks: number;
  contacts: string[];
}

@Component({
  selector: 'app-board',
  standalone: true,
  imports: [AddTask, RouterLink, DragDropModule],
  templateUrl: './board.html',
  styleUrl: './board.scss',
})
export class Board {
  cards: cardTemplate[] = [
    {
      type: 'Technical Task',
      title: 'Implementierung',
      description: 'Ein sicheres Login-System für die Benutzer erstellen.',
      subtasks: 3,
      doneSubtasks: 1,
      contacts: ['MT', 'LA', 'AT'],
    },
  ];
  dbService = inject(Supabase);
  isTaskEditMode = signal(false);
  searchQuery = signal<string>('');
  todoTasksFiltred = computed(() => this.filteredTasks().filter((task) => task.status === 'ToDo'));
  inProgressTasksFiltred = computed(() =>
    this.filteredTasks().filter((task) => task.status === 'In Progress'),
  );
  awaitingFeedbackTasksFiltred = computed(() =>
    this.filteredTasks().filter((task) => task.status === 'Awaiting Feedback'),
  );
  doneTasksFiltred = computed(() => this.filteredTasks().filter((task) => task.status === 'Done'));

  /**
   * Initializes the component by fetching initial board data and
   * setting up real-time database subscriptions.
   * Part of the Angular Lifecycle hook.
   */
  ngOnInit() {
    this.dbService.loadBoardData();
    this.dbService.subscribeToChanges();
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
    this.dbService.selectedTask.set(task);
    this.taskDetailDialog.nativeElement.showModal();
  }

  /**
   * Closes the task detail modal and clears the selected task from the global state.
   * Resets the dbService signal to null to prevent stale data on next opening.
   */
  closeTaskDetails() {
    this.taskDetailDialog.nativeElement.close();
    this.dbService.selectedTask.set(null);
  }

  // Zugriff auf das native <dialog> Element
  @ViewChild('dialog') dialog!: ElementRef<HTMLDialogElement>;

  @HostListener('window:resize', [])
  onResize() {
    if (window.innerWidth < 640 && this.dialog.nativeElement.open) {
      this.close();
    }
  }

  open() {
    if (window.innerWidth > 640) {
      // Desktop-Logik: Modal öffnen
      this.dialog.nativeElement.showModal();
    } else {
      // Mobile-Logik: Navigation zur Seite
      this.router.navigate(['/add-task']);
    }
  }

  close() {
    this.dialog.nativeElement.close();
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
    const ALL_TASKS = this.dbService.tasks();
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
      await this.dbService.deleteTask(taskId);
      this.closeTaskDetails();
      this.dbService.showNotification('Task deleted.');
    } catch (err) {
      this.dbService.showNotification('Delete failed: ' + err);
    }
  }

  //#region Testregion
  drop(event: CdkDragDrop<FullTask[]>) {
    const task = event.item.data as FullTask;
    const newStatus = event.container.id;
    //console.log(`Verschiebe Task "${task?.id}" nach: ${newStatus}`);
    if (event.previousContainer !== event.container) {
      this.dbService.updateTaskStatus(task.id!, newStatus);
    } else {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    }
  }

  //#endregion

  orientation: 'horizontal' | 'vertical' = 'vertical';
  dragDisabled = false;

  constructor(private router: Router) {
    this.updateOrientation();
  }

  @HostListener('window:resize')
  updateOrientation() {
    // > 1200px -> vertical (Karten stapeln sich)
    // < 1200px -> horizontal (Karten liegen nebeneinander)
    this.orientation = window.innerWidth > 1200 ? 'vertical' : 'horizontal';
    // Drag and Drop ausschalten ab 640px
    this.dragDisabled = window.innerWidth <= 640;
  }

  isDropDownOpen = false;

  toggleMenu() {
    this.isDropDownOpen = !this.isDropDownOpen;
  }
  closeMenu() {
    this.isDropDownOpen = false;
  }

  @HostListener('window:resize', ['$event'])
  DropDownResizeClose(event: any) {
    if (window.innerWidth > 640) {
      this.isDropDownOpen = false;
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('#dropdown-button') && !target.closest('.dropdown')) {
      this.isDropDownOpen = false;
    }
  }

  checkboxSwitch(status: boolean): string {
    if (status) {
      return 'src="/assets/icons/cheackbox-white.png" alt="checked-checkbox"';
    } else {
      return 'src="/assets/icons/cheackbox.png" alt="checkbox"';
    }
  }
}
