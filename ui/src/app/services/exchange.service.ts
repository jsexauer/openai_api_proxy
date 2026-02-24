import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { Exchange } from '../models/exchange.model';

@Injectable({ providedIn: 'root' })
export class ExchangeService {
    private _exchanges = new BehaviorSubject<Exchange[]>([]);
    exchanges$: Observable<Exchange[]> = this._exchanges.asObservable();

    private ws: WebSocket | null = null;

    constructor(private http: HttpClient) {
        this.loadExchanges();
        this.connectWebSocket();
    }

    private loadExchanges() {
        this.http.get<Exchange[]>('/api/exchanges').subscribe({
            next: (data) => this._exchanges.next(data),
            error: (err) => console.error('Failed to load exchanges', err),
        });
    }

    private connectWebSocket() {
        const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${proto}//${location.host}`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                if (msg.type === 'exchange') {
                    const current = this._exchanges.getValue();
                    this._exchanges.next([...current, msg.data]);
                }
            } catch (e) {
                console.error('WS parse error', e);
            }
        };

        this.ws.onclose = () => {
            // Reconnect after 3s
            setTimeout(() => this.connectWebSocket(), 3000);
        };
    }

    getExchange(id: number): Exchange | undefined {
        return this._exchanges.getValue().find((e) => e.id === id);
    }
}
