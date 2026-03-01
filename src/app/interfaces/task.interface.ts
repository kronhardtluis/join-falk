export type TaskPriority = 'Urgent' | 'Medium' | 'Low';
export type TaskStatus = 'ToDo' | 'In Progress' | 'Awaiting Feedback' | 'Done';
export type TaskCategory = 'Technical Task' | 'User Story';

export interface Subtask {
  id?: number;
  task_id?: number;
  title: string;
  is_done: boolean;
}

export interface Task {
  id?: number;
  title: string;
  description: string | null;
  due_date: string;
  priority: TaskPriority;
  category: TaskCategory;
  status: TaskStatus;
  created_at?: string;
}

export interface TaskFormData {
  title: string;
  description: string;
  due_date: string;
  priority: TaskPriority;
  category: TaskCategory;
  assigned_contact_ids: number[];
  subtasks: string[];
}

export interface TaskAssignment {
  contacts: {
    id: number;
    name: string;
    color: string;
    email: string;
  };
}

export interface FullTask extends Task {
  subtasks: Subtask[];
  task_assignments: TaskAssignment[];
}
