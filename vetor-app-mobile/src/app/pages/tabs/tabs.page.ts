import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TabsHeaderComponent } from '../../shared/components/tabs-header/tabs-header.component';

@Component({
  selector: 'app-tabs',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TabsHeaderComponent],
  templateUrl: './tabs.page.html',
  styleUrl: './tabs.page.scss',
})
export class TabsPage {}
