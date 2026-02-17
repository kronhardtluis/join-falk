import { Routes } from '@angular/router';
import { Mainpage } from './mainpage/mainpage';
import { Contact } from './mainpage/contact/contact';

export const routes: Routes = [
  {path:'', component: Mainpage},
{path:'contacts', component:Contact},
// {path:'privacy-policy', component:}
];
