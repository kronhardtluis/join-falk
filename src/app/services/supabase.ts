import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { Injectable, signal, computed, inject } from '@angular/core';
import { environment } from '../environments/environment.example';
import { Contact } from '../interfaces/contact.interface';
import { Task, Subtask, FullTask, TaskFormData } from '../interfaces/task.interface';
import { Router } from '@angular/router';

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
  public awaitingFeedbackTasks = computed(() => this.tasks().filter((t) => t.status === 'Awaiting Feedback'));
  public doneTasks = computed(() => this.tasks().filter((t) => t.status === 'Done'));
  public selectedTask = signal<FullTask | null>(null);
  public notificationMessage = signal<string>('');
  public logingStatus = signal<string>(localStorage.getItem('join_login_status') || 'nobody');
  public logedUser = signal<string>(localStorage.getItem('join_user_name') || "");
  public activeSite = signal<string>("");
  public activeForm = signal<'log-in' | 'sign-up'>('log-in');
  router = inject(Router);

  constructor(){
    this.checkPersistedSession();
  }

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
  * Selects a random hex color code from a predefined professional color palette.
  * These colors are used as background colors for contact avatars.
  * @returns {string} A string representing a hex color code (e.g., '#FF7A00').
  */
  getRandomColor():string{
    const COLORS = [
    '#FF7A00', '#FF5EB3', '#6E52FF', '#9327FF', '#00BEE8',
    '#1FD7C1', '#FF745E', '#FFA35E', '#FC71FF', '#FFC701',
    '#0038FF','#C3FF2B', '#FFE62B','#FF4646','#FFBB2B'
    ];
    const INDEX = Math.floor(Math.random() * COLORS.length);
    return COLORS[INDEX];
  }

  /**
   * Establishes a real-time subscription to the 'contacts' table.
   * Automatically calls getContacts() whenever an INSERT, UPDATE, or DELETE event occurs
   * to ensure the local UI state is synchronized with the database.
   * @returns {void}
   */
  subscribeToChanges() {
    if (this.channels) return;
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
    if (this.channels) {
      this.supabase.removeChannel(this.channels);
      this.channels = undefined;
    }
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
    if (!name || typeof name !== 'string') {return '';}
    const NAME = name.trim().split(/\s+/);
    const FIRST_LETTER = NAME.length > 0 ? NAME[0][0].toUpperCase() : '';
    const SECOND_LETTER = NAME.length > 1 ? NAME[1][0].toUpperCase() : '';
    return FIRST_LETTER + SECOND_LETTER;
  }

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
    .maybeSingle();
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
  * Orchestrates the full update of a task including its relations.
  */
  async updateFullTask(task: Task, contactIds: number[], subtasks: Subtask[]) {
    if (!task.id) return;
    try {
      await this.updateTaskCore(task);
      await this.updateTaskAssignments(task.id, contactIds);
      await this.updateTaskSubtasks(task.id, subtasks);
      this.showNotification("Task updated successfully!");
      await this.loadBoardData();
    } catch (error) {
      this.showNotification("Failed to update task.");
    }
  }

  /**
  * Updates the primary task details in the 'tasks' table.
  * Modifies core attributes such as title, description, due date, priority, and category
  * based on the provided task object.
  * @param {Task} task - The task object containing the new data and the unique identifier.
  * @returns {Promise<void>}
  * @private
  */
  private async updateTaskCore(task: Task) {
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
    if (error) this.showNotification("Failed to update task.");
  }

  /**
  * Synchronizes task assignments by replacing existing ones with a new set of contacts.
  * First, it removes all current assignments for the specified task, then inserts
  * new records if any contact IDs are provided.
  * @param {number} taskId - The unique ID of the task to update assignments for.
  * @param {number[]} contactIds - An array of contact IDs to be linked to the task.
  * @returns {Promise<void>}
  * @private
  */
  private async updateTaskAssignments(taskId: number, contactIds: number[]) {
    await this.supabase.from('task_assignments').delete().eq('task_id', taskId);
    if (contactIds.length > 0) {
      const ASSIGNMENTS = contactIds.map(id => ({ task_id: taskId, contact_id: id }));
      const { error } = await this.supabase.from('task_assignments').insert(ASSIGNMENTS);
      if (error) this.showNotification("Failed to update task.");
    }
  }

  /**
  * Synchronizes subtasks for a given task by comparing form data with the database.
  * @param taskId - The unique ID of the parent task.
  * @param formSubtasks - Current list of subtasks from the form.
  */
  private async updateTaskSubtasks(taskId: number, formSubtasks: Subtask[]) {
    try {
      const normalized = formSubtasks.map(s => ({
        id: s.id || undefined,
        task_id: taskId,
        title: s.title,
        is_done: s.is_done ?? false
      }));
      const originalSubtasks = this.selectedTask()?.subtasks || [];
      const currentFormIds = normalized.map(s => s.id).filter(id => !!id);
      const toDelete = originalSubtasks.filter(orig => !currentFormIds.includes(orig.id!));
      if (toDelete.length > 0) {
        await this.supabase.from('subtasks').delete().in('id', toDelete.map(s => s.id));
      }
      const toUpdate = normalized.filter(s => !!s.id);
      if (toUpdate.length > 0) {
        const { error } = await this.supabase.from('subtasks').upsert(toUpdate);
        if (error) this.showNotification("Failed to sync subtasks.");;
      }
      const toInsert = normalized
        .filter(s => !s.id)
        .map(({ id, ...data }) => data);
      if (toInsert.length > 0) {
        const { error } = await this.supabase.from('subtasks').insert(toInsert);
        if (error) this.showNotification("Failed to sync subtasks.");;
      }
    } catch (error) {
      this.showNotification("Failed to sync subtasks.");
    }
  }

  /**
  * Updates the workflow status and board position of a specific task.
  * If a new position is not provided, the method automatically calculates it by
  * finding the current maximum position in the target status column and adding
  * a gap of 1000 to allow for future drag-and-drop insertions.
  * @param {number} taskId - The unique identifier of the task to be updated.
  * @param {string} newStatus - The target status column (e.g., 'ToDo', 'In Progress').
  * @param {number} [newPosition] - Optional specific position index. If omitted,
  * it's calculated based on the highest existing position in the column.
  * @returns {Promise<void>}
  */
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

  /**
   * Registers a new user with Supabase Auth and stores additional metadata.
   * @param email - User's email address.
   * @param pass - User's chosen password.
   * @param name - Full name to be stored in user_metadata.
   * @throws Will throw the Supabase error object if registration fails.
   */
  async signUp(email: string, pass: string, name: string) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password: pass,
      options: { data: { full_name: name } }
    });
    if (error) {
      this.showNotification("Registration failed.");
      return { data: null, error };
    }
    if (data.user) {
      try {
        const NEW_CONTACT: Contact = {
          name: name,
          email: email,
          phone: "0",
          color: this.getRandomColor()
        };
        await this.addContact(NEW_CONTACT);
        this.showNotification("Contact created successful.");
      } catch (contactError) {
        this.showNotification("Failed to create contact.");
      }
    }
    this.showNotification("Registration successful.");
    this.signIn(email, pass)
    return { data, error: null };
  }

  /**
   * Authenticates a user and manages the persistence of the login state.
   * @param email - User's email address.
   * @param pass - User's password.
   * @param rememberMe - If true, the 'User' status is saved in localStorage.
   * @returns The data object on success, or an object with error on failure. // ZMIENIONO
   */
  async signIn(email: string, pass: string, rememberMe: boolean = false) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password: pass,
    });
    if (error) {
      this.showNotification("Invalid email or password.");
      return { data: null, error };
    }
    const USER_NAME = data.user?.user_metadata['full_name'] || data.user?.email || "";
    await this.ensureContactExists(email, USER_NAME);
    localStorage.setItem('join_remember_me', rememberMe.toString());
    this.setLoginStatus('user');
    this.logedUser.set(USER_NAME)
    if (rememberMe) {
      localStorage.setItem('join_user_name', USER_NAME)
    } else {
      localStorage.removeItem('join_user_name');
    }
    return data;
  }

  /**
   * Ensures that a contact corresponding to the authenticated user exists in the database.
   * * This method performs a synchronization check:
   * 1. Fetches the current contact list if the local state is empty.
   * 2. Verifies if the user's email is already present in the contacts collection.
   * 3. If missing (e.g., after manual deletion), it creates a new contact using
   * provided metadata and assigns a random color from the predefined palette.
   * 4. Refreshes the local contacts signal after a successful insertion to maintain data integrity.
   * @param email - The email address of the user to check or create.
   * @param name - The full name of the user used for contact creation.
   * @returns {Promise<void>} A promise that resolves when the synchronization check is complete.
   * @private
   */
  private async ensureContactExists(email: string, name: string) {
    if (this.contacts().length === 0) {
      await this.getContacts();
    }
    const CONTACT_EXISTS = this.contacts().some(c => c.email === email);
    if (!CONTACT_EXISTS) {
      const NEW_CONTACT: Contact = {
        name: name,
        email: email,
        phone: "0",
        color: this.getRandomColor(),
      };
      const { error } = await this.supabase.from('contacts').insert([NEW_CONTACT]);
      if (!error) {
        await this.getContacts();
      }
    }
  }

  /**
   * Manually sets the login status (e.g., for Guest access).
   * @param status - The status string to set ('Guest', 'User', or 'guest').
   */
  setLoginStatus(status:string){
    this.logingStatus.set(status);
    localStorage.setItem('join_login_status', status);
    if (status === 'guest') {
      this.logedUser.set('Guest');
      localStorage.setItem('join_user_name', 'Guest');
    }
  }

  /**
   * Verifies if a session exists in Supabase Auth or falls back to localStorage status.
   * Called automatically in the constructor to maintain user state after page refresh.
   */
  private async checkPersistedSession() {
    const { data } = await this.supabase.auth.getSession();
    const REMEMBER_ME = localStorage.getItem('join_remember_me') === 'true';
    if (data.session) {
      const NAME = data.session.user.user_metadata['full_name'];
      const EMAIL = data.session.user.email!;
      await this.ensureContactExists(EMAIL, NAME);
    }
    if (data.session && !REMEMBER_ME) {
      await this.logout();
    return;
    }
    if (data.session && REMEMBER_ME) {
      const NAME = data.session.user.user_metadata['full_name'];
      this.logedUser.set(NAME);
      localStorage.setItem('join_user_name', NAME);
    } else {
      const SAVED_STATUS = localStorage.getItem('join_login_status');
      if (SAVED_STATUS === 'guest') {
        this.logingStatus.set('guest');
        this.logedUser.set('Guest');
      } else {
        this.logingStatus.set('nobody');
      }
    }
  }

  /**
   * Signs out the current user from Supabase Auth and clears all local storage and signals.
   */
  async logout() {
    await this.supabase.auth.signOut();
    this.logingStatus.set('nobody');
    this.logedUser.set('');
    localStorage.removeItem('join_user_name');
    localStorage.removeItem('join_login_status');
    localStorage.removeItem('join_remember_me');
    this.router.navigate(['/']);
  }
}
