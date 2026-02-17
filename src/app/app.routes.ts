import { Routes } from '@angular/router';
import { Mainpage } from './mainpage/mainpage';
import { Contact } from './mainpage/contact/contact';

export const routes: Routes = [
  {path:'', component: Mainpage},
// {path:'legal-notice', component:},
// {path:'privacy-policy', component:},
  {path: 'contacts', component: Contact}
];
