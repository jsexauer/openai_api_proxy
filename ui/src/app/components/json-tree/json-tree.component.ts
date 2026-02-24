import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
  forwardRef
} from '@angular/core';
import { CommonModule } from '@angular/common';

export type JsonNodeType = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';

export interface JsonNode {
  key: string | null;      // null for root
  value: any;
  type: JsonNodeType;
  children: JsonNode[];
  collapsed: boolean;
  isLast: boolean;
}

export function detectType(val: any): JsonNodeType {
  if (val === null) return 'null';
  if (Array.isArray(val)) return 'array';
  return typeof val as JsonNodeType;
}

export function buildNode(key: string | null, val: any, isLast: boolean): JsonNode {
  const type = detectType(val);
  const children: JsonNode[] = [];

  if (type === 'object' && val !== null) {
    const keys = Object.keys(val);
    keys.forEach((k, i) => {
      children.push(buildNode(k, val[k], i === keys.length - 1));
    });
  } else if (type === 'array') {
    val.forEach((item: any, i: number) => {
      children.push(buildNode(String(i), item, i === val.length - 1));
    });
  }

  return { key, value: val, type, children, collapsed: false, isLast };
}

// ─── Recursive node renderer ────────────────────────────────────────────────

@Component({
  selector: 'app-json-node',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="node" [class.root-node]="node.key === null">

      <!-- Collapsible object / array -->
      <ng-container *ngIf="node.type === 'object' || node.type === 'array'">
        <span class="toggle" (click)="node.collapsed = !node.collapsed">
          {{ node.collapsed ? '▶' : '▼' }}
        </span>
        <span class="key" *ngIf="node.key !== null">"{{ node.key }}"<span class="colon">: </span></span>
        <span class="bracket open" (click)="node.collapsed = !node.collapsed">
          {{ node.type === 'object' ? '{' : '[' }}
        </span>

        <!-- collapsed summary -->
        <span *ngIf="node.collapsed" class="collapsed-hint" (click)="node.collapsed = false">
          {{ node.type === 'object' ? '…' + node.children.length + ' keys' : '…' + node.children.length + ' items' }}
        </span>
        <span *ngIf="node.collapsed" class="bracket close">{{ node.type === 'object' ? '}' : ']' }}<span class="comma" *ngIf="!node.isLast">,</span></span>

        <!-- expanded children -->
        <div *ngIf="!node.collapsed" class="children">
          <app-json-node
            *ngFor="let child of node.children"
            [node]="child"
            [depth]="depth + 1">
          </app-json-node>
        </div>
        <div *ngIf="!node.collapsed" class="bracket-line">
          <span class="bracket close">{{ node.type === 'object' ? '}' : ']' }}</span><span class="comma" *ngIf="!node.isLast">,</span>
        </div>
      </ng-container>

      <!-- Leaf values -->
      <ng-container *ngIf="node.type !== 'object' && node.type !== 'array'">
        <span class="toggle-placeholder"></span>
        <span class="key" *ngIf="node.key !== null && !isNumericKey(node.key)">"{{ node.key }}"<span class="colon">: </span></span>
        <span class="value" [ngClass]="'val-' + node.type">{{ formatValue(node) }}</span><span class="comma" *ngIf="!node.isLast">,</span>
      </ng-container>

    </div>
  `,
  styles: [`
    :host { display: block; }
    .node { display: flex; flex-wrap: wrap; align-items: flex-start; padding-left: 16px; position: relative; }
    .root-node { padding-left: 0; }
    .toggle { width: 14px; cursor: pointer; color: #6b7280; font-size: 9px; line-height: 1.7; flex-shrink: 0; user-select: none; margin-right: 2px; transition: color 0.1s; &:hover { color: #9ca3af; } }
    .toggle-placeholder { width: 16px; flex-shrink: 0; }
    .key { color: #93c5fd; white-space: nowrap; }
    .colon { color: #6b7280; }
    .bracket { color: #9ca3af; cursor: default; &.open { margin-right: 2px; } }
    .collapsed-hint { color: #6b7280; cursor: pointer; font-style: italic; font-size: 11px; margin: 0 2px; &:hover { color: #9ca3af; } }
    .children { width: 100%; flex-basis: 100%; }
    .bracket-line { padding-left: 16px; width: 100%; }
    .comma { color: #6b7280; }
    .val-string  { color: #86efac; }
    .val-number  { color: #fbbf24; }
    .val-boolean { color: #c084fc; }
    .val-null    { color: #f87171; font-style: italic; }
  `],
})
export class JsonNodeComponent {
  @Input() node!: JsonNode;
  @Input() depth = 0;

  isNumericKey(key: string): boolean {
    return /^\d+$/.test(key);
  }

  formatValue(node: JsonNode): string {
    if (node.type === 'null') return 'null';
    if (node.type === 'string') return `"${node.value}"`;
    if (node.type === 'boolean') return String(node.value);
    return String(node.value);
  }
}

// ─── Main tree component ────────────────────────────────────────────────

@Component({
  selector: 'app-json-tree',
  standalone: true,
  imports: [CommonModule, JsonNodeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="json-tree-root code-block" *ngIf="root">
      <app-json-node [node]="root" [depth]="0"></app-json-node>
    </div>
    <div class="json-empty code-block" *ngIf="!root">null</div>
  `,
  styles: [`
    :host { display: block; margin: 0; }
    .json-tree-root, .json-empty { font-family: var(--font-mono, monospace); font-size: 12px; line-height: 1.6; padding: 12px 14px; margin: 0; }
    .json-empty { color: var(--text-muted, #666); }
  `],
})
export class JsonTreeComponent implements OnChanges {
  @Input() data: any = null;
  root: JsonNode | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data']) {
      let parsed = this.data;
      if (typeof parsed === 'string') {
        try { parsed = JSON.parse(parsed); } catch { /* leave as string */ }
      }
      this.root = parsed !== null && parsed !== undefined
        ? buildNode(null, parsed, true)
        : null;
    }
  }
}
