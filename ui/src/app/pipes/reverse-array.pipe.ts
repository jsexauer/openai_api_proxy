import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'reverseArray',
    standalone: true,
    pure: false,
})
export class ReverseArrayPipe implements PipeTransform {
    transform<T>(value: T[]): T[] {
        return [...value].reverse();
    }
}
