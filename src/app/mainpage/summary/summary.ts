import { Component, inject, computed, OnInit, OnDestroy, signal} from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { Supabase } from '../../services/supabase';
import { TasksService } from '../../services/tasks-service';
import { OAuthService } from '../../services/o-auth-service';

@Component({
  selector: 'app-summary',
  imports: [RouterLink],
  templateUrl: './summary.html',
  styleUrl: './summary.scss',
})
export class Summary implements OnInit, OnDestroy {
  greeting = signal<string>('');
  dbService = inject(Supabase);
  taskService = inject(TasksService);
  oAuthService = inject(OAuthService);
  totalTasks = computed(() => this.taskService.tasks().length);
  urgentCount = computed(() => this.taskService.tasks().filter(task => task.priority === 'Urgent').length);
  todoCount = computed(() => this.taskService.tasks().filter(task => task.status === 'ToDo').length);
  doneCount = computed(() => this.taskService.tasks().filter(task => task.status === 'Done').length);
  inProgressCount = computed(() => this.taskService.tasks().filter(task => task.status === 'In Progress').length);
  awaitingFeedbackCount = computed(() => this.taskService.tasks().filter(task => task.status === 'Awaiting Feedback').length);
  greetingInterval: ReturnType<typeof setInterval> | undefined;
  router = inject(Router);

  /**
  * Initializes the component by setting the initial greeting,
  * starting the update interval, and loading data from the database.
  */
  ngOnInit() {
    if (this.oAuthService.logingStatus() === 'nobody') {
      this.router.navigate(['/']);
    }
    this.setGreeting();
    this.greetingInterval = setInterval(() => this.setGreeting(), 60000);
    this.taskService.loadBoardData();
  }

  /**
   * Cleans up the component by clearing the greeting interval
   * to prevent memory leaks.
   */
  ngOnDestroy() {
    if (this.greetingInterval) {
      clearInterval(this.greetingInterval);
    }
  }

  /**
  * Determines the appropriate greeting based on the current hour of the day.
  * Updates the greeting signal to trigger UI refresh.
  */
  setGreeting() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      this.greeting.set('Good morning');
    } else if (hour >= 12 && hour < 18) {
      this.greeting.set('Good afternoon');
    } else {
      this.greeting.set('Good evening');
    }
  }

  /**
  * Finds the nearest future deadline among all tasks and formats it.
  * Format: "Month Day, Year" (e.g., February 18, 2026)
  */
  upcomingDeadline = computed(() => {
    const TODAY = new Date();
    TODAY.setHours(0, 0, 0, 0);
    const FUTURE_DATES = this.taskService.tasks()
      .filter(task => task.due_date)
      .map(task => new Date(task.due_date))
      .filter(date => date >= TODAY);
    if (FUTURE_DATES.length === 0) return 'No upcoming deadline';
    const NEAREST_DATE = new Date(Math.min(...FUTURE_DATES.map(date => date.getTime())));
    return NEAREST_DATE.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  });

}
