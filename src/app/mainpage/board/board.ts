import { Component, ViewChild, ElementRef, inject } from '@angular/core';
import { AddTask } from '../add-task/add-task';
import { Supabase } from '../../services/supabase';
import { FullTask } from '../../interfaces/task.interface';

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
  imports: [AddTask],
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

  /**
  * Initializes the component by fetching initial board data and
  * setting up real-time database subscriptions.
  * Part of the Angular Lifecycle hook.
  */
  ngOnInit(){
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
  openTaskDetails(task:FullTask) {
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
  checkClickOutside(event: MouseEvent, dialogTarget?:string) {
    if(dialogTarget === "taskDetailDialog"){
      this.closeTaskDetails();
    }
    if (event.target === this.dialog.nativeElement) {
      this.close();
    }
  }

}
