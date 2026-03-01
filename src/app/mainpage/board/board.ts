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

  ngOnInit(){
    this.dbService.loadBoardData();
    this.dbService.subscribeToChanges();
  }

  // @ViewChild('taskDialog') dialog!: ElementRef<HTMLDialogElement>;

  // openDialog() {
  //   this.dialog.nativeElement.showModal();
  // }

  // closeDialog() {
  //   this.dialog.nativeElement.close();
  // }



  // Zugriff auf das native <dialog> Element
  @ViewChild('dialog') dialog!: ElementRef<HTMLDialogElement>;

  open() {
    this.dialog.nativeElement.showModal();
  }

  close() {
    this.dialog.nativeElement.close();
  }

  // Best Practice für "Klick daneben":
  // Das <dialog> Element füllt bei showModal() das gesamte Overlay aus.
  // Ein Klick auf das Element selbst (nicht den Inhalt) schließt es.
  checkClickOutside(event: MouseEvent) {
    if (event.target === this.dialog.nativeElement) {
      this.close();
    }
  }

  openTaskDetails(task:FullTask){
    console.log(task);
  }



}
