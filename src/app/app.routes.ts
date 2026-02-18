import { Routes } from '@angular/router';
import { Mainpage } from './mainpage/mainpage';
import { AddTask } from './mainpage/add-task/add-task';
import { Contact } from './mainpage/contact/contact';
import { Summary } from './mainpage/summary/summary';
import { Board } from './mainpage/board/board';
import { PrivacyPolicy } from './mainpage/privacy-policy/privacy-policy';
import { LegalNotice } from './mainpage/legal-notice/legal-notice';
import { Help } from './mainpage/help/help';

export const routes: Routes = [
  {path:'', component: Mainpage},
  {path:'add-task', component: AddTask},
  {path:'contacts', component:Contact},
  {path:'summary', component:Summary},
  {path:'board', component:Board},
  {path:'privacy-policy', component:PrivacyPolicy},
  {path:'legal-notice', component:LegalNotice},
  {path:'help', component:Help}
];
