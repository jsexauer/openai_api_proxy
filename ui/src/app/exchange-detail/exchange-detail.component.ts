import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ExchangeService } from '../services/exchange.service';
import { Exchange } from '../models/exchange.model';
import { JsonTreeComponent } from '../components/json-tree/json-tree.component';

@Component({
    selector: 'app-exchange-detail',
    standalone: true,
    imports: [CommonModule, JsonTreeComponent],
    templateUrl: './exchange-detail.component.html',
    styleUrls: ['./exchange-detail.component.scss'],
})
export class ExchangeDetailComponent implements OnInit, OnDestroy {
    exchange: Exchange | null = null;
    showReqHeaders = false;
    showResHeaders = false;

    private routeSub?: Subscription;
    private exchangeSub?: Subscription;

    constructor(
        private route: ActivatedRoute,
        private exchangeService: ExchangeService,
        private router: Router
    ) { }

    ngOnInit(): void {
        this.routeSub = this.route.paramMap.subscribe((params) => {
            const idStr = params.get('id');
            if (idStr === 'none' || !idStr) {
                this.exchange = null;
                return;
            }
            const id = parseInt(idStr);
            this.loadExchange(id);
        });

        // Listen for new exchanges to refresh if needed
        this.exchangeSub = this.exchangeService.exchanges$.subscribe(() => {
            const idStr = this.route.snapshot.paramMap.get('id');
            if (idStr && idStr !== 'none') {
                const id = parseInt(idStr);
                const ex = this.exchangeService.getExchange(id);
                if (ex) this.exchange = ex;
            }
        });
    }

    private loadExchange(id: number): void {
        const ex = this.exchangeService.getExchange(id);
        this.exchange = ex ?? null;
        this.showReqHeaders = false;
        this.showResHeaders = false;
    }

    ngOnDestroy(): void {
        this.routeSub?.unsubscribe();
        this.exchangeSub?.unsubscribe();
    }

    formatJson(val: any): string {
        if (val === null || val === undefined) return '';
        if (typeof val === 'string') {
            try { return JSON.stringify(JSON.parse(val), null, 2); } catch { return val; }
        }
        return JSON.stringify(val, null, 2);
    }

    formatArgs(args: string): string {
        try { return JSON.stringify(JSON.parse(args), null, 2); } catch { return args; }
    }

    getStatusClass(status: number | null): string {
        if (!status) return 'status-unknown';
        if (status >= 200 && status < 300) return 'status-2xx';
        if (status >= 400 && status < 500) return 'status-4xx';
        if (status >= 500) return 'status-5xx';
        return 'status-other';
    }

    getResponseContent(body: any): string {
        if (!body) return '';
        if (Array.isArray(body)) {
            // Streaming chunks: extract content
            const pieces: string[] = [];
            for (const chunk of body) {
                const choices = chunk?.choices ?? [];
                for (const choice of choices) {
                    const content = choice?.delta?.content;
                    if (content) pieces.push(content);
                }
            }
            if (pieces.length > 0) return pieces.join('');
        }
        // Non-streaming
        const choices = body?.choices ?? [];
        for (const choice of choices) {
            if (choice?.message?.content) return choice.message.content;
        }
        return '';
    }

    hasContent(body: any): boolean {
        return this.getResponseContent(body).length > 0;
    }

    getMessages(body: any): { role: string; content: string }[] {
        if (!body) return [];
        const messages = body?.messages ?? [];
        return messages.filter((m: any) => m.role && m.content);
    }

    getAvailableTools(body: any): any[] {
        if (!body) return [];
        return body?.tools ?? [];
    }

    expandedTools = new Set<number>();
    toggleTool(index: number): void {
        if (this.expandedTools.has(index)) {
            this.expandedTools.delete(index);
        } else {
            this.expandedTools.add(index);
        }
    }

    isToolExpanded(index: number): boolean {
        return this.expandedTools.has(index);
    }

    toggleReqHeaders(): void { this.showReqHeaders = !this.showReqHeaders; }
    toggleResHeaders(): void { this.showResHeaders = !this.showResHeaders; }
}
