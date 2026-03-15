import { Component, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './shared/header/header';
import { Navbar } from './shared/navbar/navbar';
import { Supabase } from './services/supabase';
import { OAuthService } from './services/o-auth-service';
import { TasksService } from './services/tasks-service';
import { ContactService } from './services/contact-service.ts';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Navbar],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('join-falk');
  dbService = inject(Supabase);
  oAuthService = inject(OAuthService)
  private tasksService = inject(TasksService);
  private contactService = inject(ContactService);

  /**
  * Initializes the core application engine upon startup.
  * This method performs two critical synchronization steps:
  * 1. **Real-time Activation**: Establishes global Supabase subscriptions for both
  * tasks and contacts, ensuring the application stays in sync with database changes
  * regardless of the current route.
  * 2. **Initial Data Fetch**: Hydrates the application state by performing the first
  * asynchronous fetch of all task and contact data.
  * By centralizing this logic in AppComponent, we ensure that data is already
  * available and reactive by the time the user navigates to specific sub-pages
  * (like Board or Contacts).
  * @returns {void}
  */
  ngOnInit() {
    this.tasksService.subscribeToChanges();
    this.contactService.subscribeToChanges();
    this.tasksService.getTasks();
    this.contactService.getContacts();
  }

}
