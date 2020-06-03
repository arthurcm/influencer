import { subDays, startOfDay, addDays, endOfMonth, addHours } from 'date-fns';

export const CALENDAR_DATA = [
  {
    id: 'events',
    data: [
      {
        start: subDays(startOfDay(new Date()), 1),
        end: addDays(new Date(), 1),
        title: 'A 3 day event',
        allDay: true,
        color: {
          primary: 'rgba(248, 158, 45, 1)',
          secondary: 'rgba(248, 158, 45, 0.5)'
        },
        resizable: {
          beforeStart: true,
          afterEnd: true
        },
        draggable: true,
        meta: {
          location: 'Los Angeles',
          notes: 'Eos eu verear adipiscing, ex ornatus denique iracundia sed, quodsi oportere appellantur an pri.',
          type: 'contentReview'
        }
      },
      {
        start: startOfDay(new Date()),
        title: 'An event with no end date',
        allDay: false,
        color: {
          primary: 'rgba(151, 61, 252, 1)',
          secondary: 'rgba(151, 61, 252, 0.5)'
        },
        resizable: {
          beforeStart: true,
          afterEnd: true
        },
        draggable: true,
        meta: {
          location: 'Los Angeles',
          notes: 'Eos eu verear adipiscing, ex ornatus denique iracundia sed, quodsi oportere appellantur an pri.',
          type: 'conceptReview'
        }
      },
      {
        start: subDays(endOfMonth(new Date()), 3),
        end: addDays(endOfMonth(new Date()), 3),
        title: 'A long event that spans 2 months',
        allDay: false,
        color: {
          primary: 'rgba(7, 192, 242, 1)',
          secondary: 'rgba(7, 192, 242, 0.5)'
        },
        resizable: {
          beforeStart: true,
          afterEnd: true
        },
        draggable: true,
        meta: {
          location: 'Los Angeles',
          notes: 'Eos eu verear adipiscing, ex ornatus denique iracundia sed, quodsi oportere appellantur an pri.',
          type: 'post'
        }
      },
      {
        start: addHours(startOfDay(new Date()), 2),
        end: new Date(),
        title: 'A draggable and resizable event',
        allDay: false,
        color: {
          primary: 'rgba(248, 158, 45, 1)',
          secondary: 'rgba(248, 158, 45, 0.5)'
        },
        resizable: {
          beforeStart: true,
          afterEnd: true
        },
        draggable: true,
        meta: {
          location: 'Los Angeles',
          notes: 'Eos eu verear adipiscing, ex ornatus denique iracundia sed, quodsi oportere appellantur an pri.',
          type: 'contentReview'
        }
      }
    ]
  }
];