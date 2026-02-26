import { Component, ViewChild, ElementRef } from '@angular/core';
import { AddTask } from '../add-task/add-task';

@Component({
  selector: 'app-board',
  imports: [AddTask],
  templateUrl: './board.html',
  styleUrl: './board.scss',
})
export class Board {

@ViewChild('taskDialog') dialog!: ElementRef<HTMLDialogElement>;

  openDialog() {
    this.dialog.nativeElement.showModal();
  }

  closeDialog() {
    this.dialog.nativeElement.close();
  }

}
