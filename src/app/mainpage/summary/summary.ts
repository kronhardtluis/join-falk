import { Component, inject, computed, signal} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Supabase } from '../../services/supabase';

@Component({
  selector: 'app-summary',
  imports: [RouterLink],
  templateUrl: './summary.html',
  styleUrl: './summary.scss',
})
export class Summary {
  greeting: string = '';
  dbService = inject(Supabase);
  totalTasks = computed(() => this.dbService.tasks().length);
  urgentCount = computed(() => this.dbService.tasks().filter(t => t.priority === 'Urgent').length);
  todoCount = computed(() => this.dbService.tasks().filter(t => t.status === 'ToDo').length);
  doneCount = computed(() => this.dbService.tasks().filter(t => t.status === 'Done').length);
  inProgressCount = computed(() => this.dbService.tasks().filter(t => t.status === 'In Progress').length);
  awaitingFeedbackCount = computed(() => this.dbService.tasks().filter(t => t.status === 'Awaiting Feedback').length);

  /**
  * Initializes the component by setting the initial greeting,
  * starting the update interval, and loading data from the database.
  */
  ngOnInit() {
    this.setGreeting();
    setInterval(() => this.setGreeting(), 60000); // jede Minute prüfen
    this.dbService.loadBoardData();
    this.dbService.subscribeToChanges();
  }

  /**
  * Determines the appropriate greeting based on the current hour of the day.
  * Updates the greeting signal to trigger UI refresh.
  */
  setGreeting() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      this.greeting = 'Good morning';
    } else if (hour >= 12 && hour < 18) {
      this.greeting = 'Good afternoon';
    } else {
      this.greeting = 'Good evening';
    }
  }

  /**
  * Finds the nearest future deadline among all tasks and formats it.
  * Format: "Month Day, Year" (e.g., February 18, 2026)
  */
  upcomingDeadline = computed(() => {
    const TODAY = new Date();
    TODAY.setHours(0, 0, 0, 0);
    const FUTURE_DATES = this.dbService.tasks()
      .filter(t => t.due_date)
      .map(t => new Date(t.due_date))
      .filter(date => date >= TODAY);
    if (FUTURE_DATES.length === 0) return 'No upcoming deadline';
    const NEAREST_DATE = new Date(Math.min(...FUTURE_DATES.map(d => d.getTime())));
    return NEAREST_DATE.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  });

}
