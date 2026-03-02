import { Component } from '@angular/core';

interface AddTaskTemplate {
  title: string,
  description: string,
  date: string,
  prio: "low"|"medium"|"urgent",
  assigned: string[],
  category: string,
  subtasks: string[],
}

@Component({
  selector: 'app-add-task',
  imports: [],
  templateUrl: './add-task.html',
  styleUrl: './add-task.scss',
})

export class AddTask {
  task: AddTaskTemplate = {
    title: "",
    description: "",
    date: "",
    prio: "medium",
    assigned: [""],
    category: "",
    subtasks: [""]
  }

  addSubtask(): void {
    const subtaskRef = document.getElementById("add-subtask")!;
    // const subtask = subtaskRef.value;
  }

  minDate = new Date().toISOString().split('T')[0];
}
