import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeService } from '../../core/services/theme.service';
import { DashboardPreviewComponent } from './dashboard-preview.component';
import { ContactoComponent } from '../contacto/contacto.component';

@Component({
  selector: 'app-landing',
  imports: [RouterLink, DashboardPreviewComponent, ContactoComponent],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css',
})
export class LandingComponent {
  protected readonly theme = inject(ThemeService);
}
