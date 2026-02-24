import { Component } from '@angular/core';
import { NgClass } from "../../../../node_modules/@angular/common/types/_common_module-chunk";
import { RouterLink, RouterLinkActive } from "@angular/router";

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {

}
