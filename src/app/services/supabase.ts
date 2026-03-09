import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { Injectable, signal, computed } from '@angular/core';
import { environment } from '../environments/environment.example';
import { Contact } from '../interfaces/contact.interface';
import { Subtask, FullTask, TaskFormData } from '../interfaces/task.interface';

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
  public todoTasks = computed(() => this.tasks().filter((t) => t.status === 'ToDo'));
  public inProgressTasks = computed(() => this.tasks().filter((t) => t.status === 'In Progress'));
  public awaitingFeedbackTasks = computed(() =>
    this.tasks().filter((t) => t.status === 'Awaiting Feedback'),
  );
  public doneTasks = computed(() => this.tasks().filter((t) => t.status === 'Done'));
  public selectedTask = signal<FullTask | null>(null);
  public notificationMessage = signal<string>('');

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
  subscribeToChanges() {
    this.channels = this.supabase
      .channel('custom-all-channel')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        this.getContacts();
        this.getTasks();
      })
      .subscribe();
  }

  /**
   * Lifecycle hook that cleans up resources before the service or component is destroyed.
   * Unsubscribes from the active Supabase real-time channel to prevent memory leaks.
   * @returns {void}
   */
  ngOnDestroy() {
    if (this.channels) this.supabase.removeChannel(this.channels);
  }

  /**
   * Fetches a single contact from the database by its unique identifier.
   * @param {number} id - The ID of the contact to retrieve.
   * @returns {Promise<Contact | null>} A promise that resolves to the contact object or null if not found.
   */
  async getContactById(id: number) {
    const { data, error } = await this.supabase.from('contacts').select('*').eq('id', id).single();
    if (error) {
      this.showNotification('Error fetching contact.');
      return null;
    }
    return data;
  }

  /**
   * Adds a new contact to the database.
   * @param contact - The contact data to insert.
   */
  async addContact(contact: Contact) {
    const { data, error } = await this.supabase.from('contacts').insert([contact]).select();
    if (!error) await this.getContacts();
  }

  /**
   * Updates an existing contact by its ID[cite: 69, 74].
   * @param id - The unique identifier of the contact.
   * @param contact - The updated contact data.
   */
  async updateContact(id: number, contact: Partial<Contact>) {
    const { error } = await this.supabase.from('contacts').update(contact).eq('id', id);
    if (!error) await this.getContacts();
  }

  /**
   * Deletes a contact from the database permanently.
   * @param id - The ID of the contact to be removed.
   */
  async deleteContact(id: number) {
    const { error } = await this.supabase.from('contacts').delete().eq('id', id);
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
    const { data, error } = await this.supabase.from('tasks').select(`
      *,
      subtasks (*),
      task_assignments (
        contacts (*)
      )
    `).order('position', { ascending: true });
    if (error) {
      this.showNotification("Error fetching tasks.");
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
      this.showNotification('Board loading failed.')
    }
  }

  /**
   * Calculates the number of completed subtasks within a given array.
   * Filters the subtasks based on their 'is_done' boolean status.
   * @param subtasks - An array of subtask objects to be evaluated.
   * @returns The total count of subtasks marked as completed.
   */
  getDoneSubtasksCount(subtasks: Subtask[]): number {
    return subtasks.filter((s) => s.is_done).length;
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
    this.selectedTask.update((task) => {
      if (task && task.subtasks) {
        const updatedSubtasks = task.subtasks.map((s) =>
          s.id === subtask.id ? { ...s, is_done: NEW_STATUS } : s,
        );
        return { ...task, subtasks: updatedSubtasks };
      }
      return task;
    });
    const { error } = await this.supabase
      .from('subtasks')
      .update({ is_done: NEW_STATUS })
      .eq('id', subtask.id);
    if (error) {
      this.showNotification("Error updating subtask.")
    }
  }

  /**
  * Creates a new task with its associated assignments and subtasks.
  * This method performs several steps:
  * 1. Calculates the next available 'position' for the task within its specific status column
  * using a gap-based strategy (current max + 1000) to allow for future drag-and-drop insertions.
  * 2. Inserts the core task data into the database.
  * 3. Concurrently creates task assignments (contacts) and subtasks using the new task ID.
  * 4. Refreshes the local board state to reflect the changes.
  * @param taskData - The primary task information (title, description, status, etc.).
  * @param contactIds - An array of contact IDs to be assigned to this task.
  * @param subtasks - An array of subtask objects to be created for this task.
  * @returns A Promise that resolves when the task and all its dependencies are successfully created.
  */
  async createTask(taskData: TaskFormData, contactIds: number[], subtasks: { title: string }[]) {
    const { data: maxTask } = await this.supabase
    .from('tasks')
    .select('position')
    .eq('status', taskData.status)
    .order('position', { ascending: false })
    .limit(1)
    .single();
    const CURRENT_MAX = maxTask?.position ?? 0;
    taskData.position = CURRENT_MAX + 1000;
    const NEW_TASK = await this.insertTask(taskData);
    await Promise.all([
      this.insertTaskAssignments(NEW_TASK.id, contactIds),
      this.insertSubtasks(NEW_TASK.id, subtasks),
    ]);
    await this.loadBoardData();
  }

  /**
   * Inserts the primary task record and returns the created object.
   */
  async insertTask(taskData: TaskFormData) {
    const { data, error } = await this.supabase.from('tasks').insert([taskData]).select().single();
    if (error) this.showNotification("Failed to insert task");
    return data;
  }

  /**
   * Links contacts to a specific task.
   */
  async insertTaskAssignments(taskId: number, contactIds: number[]) {
    if (contactIds.length === 0) return;
    const ASSIGNMENTS = contactIds.map((contact_id) => ({ task_id: taskId, contact_id }));
    const { error } = await this.supabase.from('task_assignments').insert(ASSIGNMENTS);
    if (error) this.showNotification(`Failed to assign contacts.`);
  }

  /**
   * Creates subtasks for a specific task.
   */
  async insertSubtasks(taskId: number, subtasks: { title: string }[]) {
    if (subtasks.length === 0) return;
    const RECORDS = subtasks.map((subtask) => ({
      task_id: taskId,
      title: subtask.title,
      is_done: false,
    }));
    const { error } = await this.supabase.from('subtasks').insert(RECORDS);
    if (error) this.showNotification(`Failed to create subtasks.`);
  }

  /**
   * Deletes a task by ID. Database CASCADE should handle subtasks and assignments.
   * @param taskId - The ID of the task to remove.
   */
  async deleteTask(taskId: number) {
    const { error } = await this.supabase.from('tasks').delete().eq('id', taskId);
    if (error) throw error;
    await this.loadBoardData();
  }

  /**
  * Triggers the notification toast by setting the message signal.
  * The UI reacts by adding the '.show' class, which initiates a CSS transition
  * for opacity and right-positioning.
  * @param {string} message - The text to be displayed.
  */
  showNotification(message:string){
    this.notificationMessage.set(message);
    setTimeout(() => {this.notificationMessage.set('');}, 1250);
  }

  /**
  * Updates the core details of a task in the Supabase database.
  * @param {FullTask} task - The task object containing updated information.
  * @returns {Promise<void>}
  */
  async updateFullTask(task: FullTask) {
    const { error } = await this.supabase
      .from('tasks')
      .update({
        title: task.title,
        description: task.description,
        due_date: task.due_date,
        priority: task.priority,
        category: task.category
      })
      .eq('id', task.id);
    if (error) {
      this.showNotification("Failed to update task.");
    }
    await this.loadBoardData();
  }

  async updateTaskStatus(taskId: number, newStatus: string, newPosition?: number) {
    let finalPosition = newPosition;
    if (finalPosition === undefined) {
      const { data: maxTask } = await this.supabase
        .from('tasks')
        .select('position')
        .eq('status', newStatus)
        .order('position', { ascending: false })
        .limit(1)
        .maybeSingle();
      finalPosition = (maxTask?.position ?? 0) + 1000;
    }

    const { error } = await this.supabase
      .from('tasks')
      .update({ status: newStatus, position: finalPosition})
      .eq('id', taskId);

    if (error) {
      this.showNotification("Failed to update task status.");
    }
  }
}
