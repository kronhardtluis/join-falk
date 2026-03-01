import { Component, inject, ElementRef, ViewChild } from '@angular/core';
import { Supabase } from '../../services/supabase';
import { FullTask } from '../../interfaces/task.interface';

@Component({
  selector: 'app-board',
  imports: [],
  templateUrl: './board.html',
  styleUrl: './board.scss',
})
export class Board {
  // Logik und Eigenschaften
  title = 'Board';
  columns: string[] = ['To Do', 'In Progress', 'Await Feedback', 'Done'];
  @ViewChild('taskDialog') dialog!: ElementRef<HTMLDialogElement>;

  dbService = inject(Supabase);

  ngOnInit(){
    this.dbService.loadBoardData();
    this.dbService.subscribeToChanges();
  }

  openTaskDetails(task: FullTask) {
    this.dbService.selectedTask.set(task);
    this.dialog.nativeElement.showModal();
  }

  closeTaskDetails() {
    this.dbService.selectedTask.set(null);
    const DIALOG_ELEMENT = this.dialog.nativeElement;
    DIALOG_ELEMENT.close();
  }


}
