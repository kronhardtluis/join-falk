import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { Injectable, signal, computed } from '@angular/core';
import { environment } from '../environments/environment.example';
import { Contact } from '../interfaces/contact.interface';
import { Subtask, FullTask } from '../interfaces/task.interface';

@Injectable({
  providedIn: 'root',
})
export class Supabase {
  private superbaseURL = environment.supabaseUrl;
  private supabaseKEY = environment.supabaseKey;
  private supabase = createClient(this.superbaseURL, this.supabaseKEY);
  channels: RealtimeChannel | undefined;
  public contacts = signal<Contact[]>([]);
  public tasks = signal<FullTask[]>([]);
  public todoTasks = computed(() => this.tasks().filter(t => t.status === 'ToDo'));
  public inProgressTasks = computed(() => this.tasks().filter(t => t.status === 'In Progress'));
  public awaitingFeedbackTasks = computed(() => this.tasks().filter(t => t.status === 'Awaiting Feedback'));
  public doneTasks = computed(() => this.tasks().filter(t => t.status === 'Done'));
  public selectedTask = signal<FullTask | null>(null);

  /**
  * Fetches all contacts from the database, sorted alphabetically by name.
  */
  async getContacts() {
    const { data, error } = await this.supabase
      .from('contacts')
      .select('*')
      .order('name', { ascending: true });
    if (data) this.contacts.set(data);
  }

  /**
  * Establishes a real-time subscription to the 'contacts' table.
  * Automatically calls getContacts() whenever an INSERT, UPDATE, or DELETE event occurs
  * to ensure the local UI state is synchronized with the database.
  * @returns {void}
  */
  subscribeToChanges(){
    this.channels = this.supabase.channel('custom-all-channel')
      .on(
        'postgres_changes',
        {event: '*', schema: 'public'},
        () => {
          this.getContacts();
          this.getTasks();
        }
      )
      .subscribe();
  }

  /**
  * Lifecycle hook that cleans up resources before the service or component is destroyed.
  * Unsubscribes from the active Supabase real-time channel to prevent memory leaks.
  * @returns {void}
  */
  ngOnDestroy(){
    if(this.channels) this.supabase.removeChannel(this.channels);
  }

  /**
  * Fetches a single contact from the database by its unique identifier.
  * @param {number} id - The ID of the contact to retrieve.
  * @returns {Promise<Contact | null>} A promise that resolves to the contact object or null if not found.
  */
  async getContactById(id: number) {
    const { data, error } = await this.supabase
      .from('contacts')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      console.error('Error fetching contact:', error.message);
      return null;
    }
    return data;
  }

  /**
  * Adds a new contact to the database.
  * @param contact - The contact data to insert.
  */
  async addContact(contact: Contact) {
    const { data, error } = await this.supabase
      .from('contacts')
      .insert([contact])
      .select();
    if (!error) await this.getContacts();
  }

  /**
  * Updates an existing contact by its ID[cite: 69, 74].
  * @param id - The unique identifier of the contact.
  * @param contact - The updated contact data.
  */
  async updateContact(id: number, contact: Partial<Contact>) {
    const { error } = await this.supabase
      .from('contacts')
      .update(contact)
      .eq('id', id);
    if (!error) await this.getContacts();
  }

  /**
  * Deletes a contact from the database permanently.
  * @param id - The ID of the contact to be removed.
  */
  async deleteContact(id: number) {
    const { error } = await this.supabase
      .from('contacts')
      .delete()
      .eq('id', id);
    if (!error) await this.getContacts();
  }

  /**
  * Generates initials from a given full name.
  * Extracts the first letter of the first and second name parts and converts them to uppercase.
  * @param name - The full name string to process (e.g., "John Doe").
  * @returns A string containing up to two uppercase initials (e.g., "JD").
  * Returns an empty string if the input is empty or invalid.
  */
  getInitials(name: string): string {
    const NAME = name.trim().split(/\s+/);
    const FIRST_LETTER = NAME.length > 0 ? NAME[0][0].toUpperCase() : '';
    const SECOND_LETTER = NAME.length > 1 ? NAME[1][0].toUpperCase() : '';
    return FIRST_LETTER + SECOND_LETTER;
  }

//TASK ---------------------------------------------

  /**
  * Fetches all tasks from the database including their related subtasks and assigned contacts.
  * Uses PostgREST resource embedding to join four tables in a single request.
  * @returns {Promise<FullTask[]>} A promise that resolves to an array of full task objects.
  * @throws Will throw an error if the Supabase request fails.
  */
  async getTasks(): Promise<FullTask[]> {
    const { data, error } = await this.supabase
      .from('tasks')
      .select(`
        *,
        subtasks (*),
        task_assignments (
          contacts (*)
        )
      `);
    if (error) {
      console.error('Error fetching tasks:', error.message);
      throw error;
    }
    this.tasks.set(data as FullTask[]);
    return data as FullTask[];
  }

  /**
  * Orchestrates the initial loading of board data.
  * Fetches tasks from the database and updates the reactive 'tasks' signal.
  * Catches and logs any errors occurring during the asynchronous fetch process.
  * @returns {Promise<void>}
  */
  async loadBoardData() {
    try {
      const TASK_DATA = await this.getTasks();
      this.tasks.set(TASK_DATA);
    } catch (error) {
      console.error('Board loading failed', error);
    }
  }

  /**
  * Calculates the number of completed subtasks within a given array.
  * Filters the subtasks based on their 'is_done' boolean status.
  * @param subtasks - An array of subtask objects to be evaluated.
  * @returns The total count of subtasks marked as completed.
  */
  getDoneSubtasksCount(subtasks: Subtask[]): number {
    return subtasks.filter(s => s.is_done).length;
  }

  /**
  * Toggles the completion status of a specific subtask in the database.
  * Inverts the current 'is_done' value and performs an asynchronous update in Supabase.
  * Error handling is included to log failed database operations.
  * @param subtask - The subtask object to be toggled and updated.
  * @returns {Promise<void>}
  */
  async toggleSubtaskStatus(subtask: Subtask) {
    const NEW_STATUS = !subtask.is_done;
    const { error } = await this.supabase
      .from('subtasks')
      .update({ is_done: NEW_STATUS })
      .eq('id', subtask.id);
    if (error) {
      console.error('Error updating subtask:', error.message);
    }
  }

}
