import { Component, ViewChild, ElementRef, inject, HostListener, signal, computed } from '@angular/core';
import { AddTask } from '../add-task/add-task';
import { Supabase } from '../../services/supabase';
import { FullTask } from '../../interfaces/task.interface';
import { RouterLink } from "@angular/router";

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
  imports: [AddTask, RouterLink],
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
  todoTasksFiltred = computed(() => this.filteredTasks().filter(task => task.status === 'ToDo'));
  inProgressTasksFiltred = computed(() => this.filteredTasks().filter(task => task.status === 'In Progress'));
  awaitingFeedbackTasksFiltred = computed(() => this.filteredTasks().filter(task => task.status === 'Awaiting Feedback'));
  doneTasksFiltred = computed(() => this.filteredTasks().filter(task => task.status === 'Done'));

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
    this.dialog.nativeElement.showModal();
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
    return ALL_TASKS.filter(task =>
      task.title.toLowerCase().includes(QUERY) || task.description?.toLowerCase().includes(QUERY)
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

}
