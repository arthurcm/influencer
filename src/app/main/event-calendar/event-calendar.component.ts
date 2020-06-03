import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import {
  CalendarEvent,
  CalendarMonthViewDay,
  CalendarEventAction
} from 'angular-calendar';
import { Subject } from 'rxjs';
import { startOfDay, isSameDay, isSameMonth } from 'date-fns';
import { MatCalendar } from '@angular/material/datepicker';
import { CalendarDataService } from './calendar-event-data.service';
import { CalendarEventModel } from './event.model';
import { eventStatus, EVENT_TYPE } from './event-types';
import { PerfectScrollbarConfigInterface } from 'ngx-perfect-scrollbar';

@Component({
  selector: 'app-event-calendar',
  templateUrl: './event-calendar.component.html',
  styleUrls: ['./event-calendar.component.scss'],
  encapsulation: ViewEncapsulation.None,
  providers: [CalendarDataService]
})
export class EventCalendarComponent implements OnInit {

  public view: string;

  public viewDate: Date;

  public events: CalendarEvent[];

  public refresh: Subject<any> = new Subject();

  public activeDayIsOpen: boolean;

  public selectedDay: any;

  public actions?: CalendarEventAction[];

  public config: PerfectScrollbarConfigInterface = {};

  public views = [
    'month',
    'week',
    'day'
  ];

  public eventStatus = eventStatus;

  public eventTypes = EVENT_TYPE;

  constructor(private calendarService: CalendarDataService) { }

  ngOnInit(): void {

    this.view = 'month';
    this.viewDate = new Date();
    this.activeDayIsOpen = true;
    this.selectedDay = { date: startOfDay(new Date()) };

    this.calendarService.getEvents().subscribe((r: CalendarEvent[]) => {

      this.events = this.getCopiedEvents(r);
    });
  }

  /**
   * This will trigger when you click on a day
   * on the fullcalendar
   * @param day calendar day
   */
  public dayClicked(day: CalendarMonthViewDay): void {
    this.viewDate = day.date;
  }

  /**
   * This will filter out the events based on the
   * currently active event types
   * @param type type of the event
   */
  public filterEvents(type) {

    this.eventStatus[type] = !this.eventStatus[type];

    const originalEvents = this.getCopiedEvents(this.calendarService.originalEvents);

    this.events = originalEvents.filter(e => {
      if (e.meta) {

        return this.eventStatus[e.meta.type];
      }

      return false;
    });
  }

  /**
   * This will change the viewdate when the date is changed from the
   * right side calendar
   * @param ev date
   */
  public changeSelectedDate(ev: any) {

    this.viewDate = ev;
  }

  /**
   * This will return a copy of the events array and parse the dates
   * @param events original event objects
   */
  private getCopiedEvents(events: CalendarEvent[]) {

    let originalEvents = JSON.parse(JSON.stringify(events));

    originalEvents = originalEvents.map((ev: CalendarEvent) => {

      ev.start = new Date(ev.start);

      ev.end = new Date(ev.end);

      return ev;
    });

    return originalEvents;
  }

}
