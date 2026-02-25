import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ExchangeService } from '../services/exchange.service';
import { Exchange } from '../models/exchange.model';
import { Observable } from 'rxjs';
import { ReverseArrayPipe } from '../pipes/reverse-array.pipe';

@Component({
    selector: 'app-sidebar',
    standalone: true,
    imports: [CommonModule, RouterModule, ReverseArrayPipe],
    templateUrl: './sidebar.component.html',
    styleUrls: ['./sidebar.component.scss'],
})
export class SidebarComponent implements OnInit {
    exchanges$!: Observable<Exchange[]>;

    constructor(
        private exchangeService: ExchangeService,
        private router: Router
    ) { }

    ngOnInit(): void {
        this.exchanges$ = this.exchangeService.exchanges$;
    }

    navigateTo(id: number): void {
        this.router.navigate(['/exchange', id]);
    }

    getStatusClass(status: number | null): string {
        if (!status) return 'status-unknown';
        if (status >= 200 && status < 300) return 'status-2xx';
        if (status >= 400 && status < 500) return 'status-4xx';
        if (status >= 500) return 'status-5xx';
        return 'status-other';
    }

    getMethodClass(method: string): string {
        return `method-${method.toLowerCase()}`;
    }

    formatTime(ts: string): string {
        return new Date(ts).toLocaleTimeString();
    }

    shortPath(path: string): string {
        return path.length > 30 ? '...' + path.slice(-27) : path;
    }

    trackById(index: number, ex: Exchange): number {
        return ex.id;
    }
}
