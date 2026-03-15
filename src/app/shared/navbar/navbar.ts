import { Component, inject } from '@angular/core';
import { NgClass } from "../../../../node_modules/@angular/common/types/_common_module-chunk";
import { RouterLink, RouterLinkActive } from "@angular/router";
import { Supabase } from '../../services/supabase';
import { OAuthService } from '../../services/o-auth-service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  dbService = inject(Supabase);
  oAuthService = inject(OAuthService)
}
