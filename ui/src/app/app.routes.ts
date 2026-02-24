import { Routes } from '@angular/router';
import { ExchangeDetailComponent } from './exchange-detail/exchange-detail.component';

export const routes: Routes = [
    { path: 'exchange/:id', component: ExchangeDetailComponent },
    { path: '', redirectTo: 'exchange/none', pathMatch: 'full' },
    { path: '**', redirectTo: 'exchange/none' },
];
