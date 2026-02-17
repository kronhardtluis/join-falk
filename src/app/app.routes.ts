import { Routes } from '@angular/router';
import { Mainpage } from './mainpage/mainpage';
import { AddTask } from './mainpage/add-task/add-task';
import { Contact } from './mainpage/contact/contact';

export const routes: Routes = [
  {path:'', component: Mainpage},
  {path:'add-task', component: AddTask},
  {path:'contacts', component: Contact}
// {path:'legal-notice', component:},
// {path:'privacy-policy', component:}
];
