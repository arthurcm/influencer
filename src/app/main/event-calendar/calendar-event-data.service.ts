import { Injectable } from '@angular/core';
import { CALENDAR_DATA } from './calendar-mock';
import { CalendarEvent } from 'angular-calendar';
import { CalendarEventModel } from './event.model';
import { Observable, of } from 'rxjs';

@Injectable()
export class CalendarDataService {

  public originalEvents: CalendarEvent[];

  public getEvents(): Observable<CalendarEvent[]> {

    this.originalEvents = CALENDAR_DATA[0].data.map((item: any) => {
      return new CalendarEventModel(item);
    });

    return of(this.originalEvents);
  }
}
