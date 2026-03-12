import { Component, inject } from '@angular/core';
import { App } from '../app';
import { Supabase } from '../services/supabase';

@Component({
  selector: 'app-mainpage',
  imports: [],
  templateUrl: './mainpage.html',
  styleUrl: './mainpage.scss',
})
export class Mainpage{

  dbservice = inject(Supabase);

  // testlog(){
  //   this.dbservice.setLoginStatus("eingelogen");
  // }

  // testlogout(){
  //   this.dbservice.setLoginStatus("guest");
  // }

}
