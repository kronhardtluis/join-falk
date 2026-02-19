import { Component} from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-summary',
  imports: [RouterLink],
  templateUrl: './summary.html',
  styleUrl: './summary.scss',
})
export class Summary {
  greeting: string = '';

  ngOnInit() {
    this.setGreeting();
    setInterval(() => this.setGreeting(), 60000); // jede Minute prüfen
  }

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
}
