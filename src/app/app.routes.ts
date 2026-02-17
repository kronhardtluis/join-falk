import { Routes } from '@angular/router';
import { Mainpage } from './mainpage/mainpage';
import { Contact } from './mainpage/contact/contact';
import { Summary } from './mainpage/summary/summary';

export const routes: Routes = [
  {path:'', component: Mainpage},
{path:'contacts', component:Contact},
{path:'summary', component:Summary}
];
