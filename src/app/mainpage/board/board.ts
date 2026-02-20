import { Component } from '@angular/core';

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
}
