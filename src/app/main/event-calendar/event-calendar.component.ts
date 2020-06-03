import { Component, OnInit, ViewEncapsulation, ViewChild } from '@angular/core';
import {
  CalendarEvent,
  CalendarMonthViewDay,
  CalendarEventTimesChangedEvent,
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

    /**
         * Watch re-render-refresh for updating db
         */
    this.refresh.subscribe((updateDB) => {
      if (updateDB) {
      }
    });

    this.calendarService.getEvents().subscribe((r: CalendarEvent[]) => {

      this.events = this.getCopiedEvents(r);
    });
  }

  public dayClicked(day: CalendarMonthViewDay): void {
    const date: Date = day.date;
    const events: CalendarEvent[] = day.events;

  }

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

  public changeSelectedDate(ev: any) {

    this.viewDate = ev;
  }

  /**
     * Edit Event
     *
     * @param {string} action
     * @param {CalendarEvent} event
     */
  public editEvent(action: string, event: CalendarEvent): void {
    const eventIndex = this.events.indexOf(event);


  }

  /**
     * Event times changed
     * Event dropped or resized
     *
     * @param {CalendarEvent} event
     * @param {Date} newStart
     * @param {Date} newEnd
     */
  public eventTimesChanged({ event, newStart, newEnd }: CalendarEventTimesChangedEvent): void {
    event.start = newStart;
    event.end = newEnd;
    // console.warn('Dropped or resized', event);
    this.refresh.next(true);
  }

  /**
     * Before View Renderer
     *
     * @param {any} header
     * @param {any} body
     */
  public beforeMonthViewRender({ header, body }): void {
    /**
     * Get the selected day
     */
    const _selectedDay = body.find((_day) => {
      return _day.date.getTime() === this.selectedDay.date.getTime();
    });

    if (_selectedDay) {
      /**
       * Set selected day style
       * @type {string}
       */
      _selectedDay.cssClass = 'cal-selected';
    }

  }

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
