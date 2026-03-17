import { Injectable, signal, inject, computed } from '@angular/core';
import { Supabase } from './supabase';
import { Task, Subtask, FullTask, TaskFormData } from '../interfaces/task.interface';
import { RealtimeChannel } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root',
})
export class TasksService {
  dbService = inject(Supabase);
  public tasks = signal<FullTask[]>([]);
  public todoTasks = computed(() => this.tasks().filter((t) => t.status === 'ToDo'));
  public inProgressTasks = computed(() => this.tasks().filter((t) => t.status === 'In Progress'));
  public awaitingFeedbackTasks = computed(() => this.tasks().filter((t) => t.status === 'Awaiting Feedback'));
  public doneTasks = computed(() => this.tasks().filter((t) => t.status === 'Done'));
  public selectedTask = signal<FullTask | null>(null);
  channels: RealtimeChannel | undefined;

  /**
  * Establishes a real-time subscription to database changes via Supabase Channels.
  * Listens for all PostgreSQL operations (INSERT, UPDATE, DELETE) on the 'public' schema.
  * When a change is detected, it automatically triggers {@link getTasks} to synchronize
  * the local application state with the remote database.
  * Note: This method implements a singleton-like pattern for the channel to prevent
  * multiple redundant subscriptions.
  * @returns {void}
  */
  subscribeToChanges() {
    if (this.channels) return;
    this.channels = this.dbService.supabase
      .channel('tasks-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        this.loadBoardData();
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
      this.channels.unsubscribe();
      this.dbService.supabase.removeChannel(this.channels);
      this.channels = undefined;
    }
  }

  /**
  * Fetches all tasks from the database including their related subtasks and assigned contacts.
  * Uses PostgREST resource embedding to join four tables in a single request.
  * @returns {Promise<FullTask[]>} A promise that resolves to an array of full task objects.
  * @throws Will throw an error if the Supabase request fails.
  */
  async getTasks(): Promise<FullTask[]> {
    const { data, error } = await this.dbService.supabase.from('tasks').select(`
      *,
      subtasks (*),
      task_assignments (
        contacts (*)
      )
    `).order('position', { ascending: true });
    if (error) {
      this.dbService.showNotification("Error fetching tasks.");
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
      this.dbService.showNotification('Board loading failed.')
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
    const { error } = await this.dbService.supabase
      .from('subtasks')
      .update({ is_done: NEW_STATUS })
      .eq('id', subtask.id);
    if (error) {
      this.dbService.showNotification("Error updating subtask.")
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
    const { data: maxTask } = await this.dbService.supabase
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
    const { data, error } = await this.dbService.supabase.from('tasks').insert([taskData]).select().single();
    if (error) this.dbService.showNotification("Failed to insert task");
    return data;
  }

  /**
  * Links contacts to a specific task.
  */
  async insertTaskAssignments(taskId: number, contactIds: number[]) {
    if (contactIds.length === 0) return;
    const ASSIGNMENTS = contactIds.map((contact_id) => ({ task_id: taskId, contact_id }));
    const { error } = await this.dbService.supabase.from('task_assignments').insert(ASSIGNMENTS);
    if (error) this.dbService.showNotification(`Failed to assign contacts.`);
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
    const { error } = await this.dbService.supabase.from('subtasks').insert(RECORDS);
    if (error) this.dbService.showNotification(`Failed to create subtasks.`);
  }

  /**
  * Deletes a task by ID. Database CASCADE should handle subtasks and assignments.
  * @param taskId - The ID of the task to remove.
  */
  async deleteTask(taskId: number) {
    const { error } = await this.dbService.supabase.from('tasks').delete().eq('id', taskId);
    if (error) throw error;
    await this.loadBoardData();
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
      this.dbService.showNotification("Task updated successfully!");
      await this.loadBoardData();
    } catch (error) {
      this.dbService.showNotification("Failed to update task.");
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
    const { error } = await this.dbService.supabase
      .from('tasks')
      .update({
        title: task.title,
        description: task.description,
        due_date: task.due_date,
        priority: task.priority,
        category: task.category
      })
      .eq('id', task.id);
    if (error) this.dbService.showNotification("Failed to update task.");
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
    await this.dbService.supabase.from('task_assignments').delete().eq('task_id', taskId);
    if (contactIds.length > 0) {
      const ASSIGNMENTS = contactIds.map(id => ({ task_id: taskId, contact_id: id }));
      const { error } = await this.dbService.supabase.from('task_assignments').insert(ASSIGNMENTS);
      if (error) this.dbService.showNotification("Failed to update task.");
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
        await this.dbService.supabase.from('subtasks').delete().in('id', toDelete.map(s => s.id));
      }
      const toUpdate = normalized.filter(s => !!s.id);
      if (toUpdate.length > 0) {
        const { error } = await this.dbService.supabase.from('subtasks').upsert(toUpdate);
        if (error) this.dbService.showNotification("Failed to sync subtasks.");;
      }
      const toInsert = normalized
        .filter(s => !s.id)
        .map(({ id, ...data }) => data);
      if (toInsert.length > 0) {
        const { error } = await this.dbService.supabase.from('subtasks').insert(toInsert);
        if (error) this.dbService.showNotification("Failed to sync subtasks.");;
      }
    } catch (error) {
      this.dbService.showNotification("Failed to sync subtasks.");
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
      const { data: maxTask } = await this.dbService.supabase
        .from('tasks')
        .select('position')
        .eq('status', newStatus)
        .order('position', { ascending: false })
        .limit(1)
        .maybeSingle();
      finalPosition = (maxTask?.position ?? 0) + 1000;
    }
    const { error } = await this.dbService.supabase
      .from('tasks')
      .update({ status: newStatus, position: finalPosition})
      .eq('id', taskId);
    if (error) {
      this.dbService.showNotification("Failed to update task status.");
    }
  }
}
