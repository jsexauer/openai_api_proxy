import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar/sidebar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent],
  template: `
    <div class="app-layout">
      <aside class="sidebar-pane">
        <app-sidebar></app-sidebar>
      </aside>
      <main class="main-pane">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .app-layout {
      display: flex;
      height: 100vh;
      overflow: hidden;
    }
    .sidebar-pane {
      width: 260px;
      flex-shrink: 0;
      height: 100%;
    }
    .main-pane {
      flex: 1;
      height: 100%;
      overflow: hidden;
    }
  `]
})
export class App { }
