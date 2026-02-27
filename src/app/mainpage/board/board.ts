import { Component } from '@angular/core';

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
  imports: [],
  templateUrl: './board.html',
  styleUrl: './board.scss',
})

export class Board {
  // Logik und Eigenschaften
  title = 'Board';
  columns: string[] = ['To Do', 'In Progress', 'Await Feedback', 'Done'];
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
}
