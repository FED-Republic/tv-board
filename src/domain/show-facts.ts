import type { Network, Schedule, ShowDetail } from '@/domain/show';

export type ShowFact = {
  readonly term: string;
  readonly description: string;
};

// TVmaze dates are plain calendar days; formatting in UTC keeps them off by zero everywhere.
const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** The detail page's fact list, in display order, with unknown values left out. */
export function describeShow(show: ShowDetail): readonly ShowFact[] {
  const facts: ShowFact[] = [{ term: 'Status', description: show.status }];

  if (show.premiered !== null) {
    facts.push({ term: 'Premiered', description: formatDate(show.premiered) });
  }

  if (show.language !== null) {
    facts.push({ term: 'Language', description: show.language });
  }

  if (show.runtimeMinutes !== null) {
    facts.push({ term: 'Runtime', description: `${show.runtimeMinutes} min` });
  }

  if (show.network !== null) {
    facts.push(describeNetwork(show.network));
  }

  const schedule = describeSchedule(show.schedule);

  if (schedule !== '') {
    facts.push({ term: 'Schedule', description: schedule });
  }

  return facts;
}

const formatDate = (isoDate: string): string =>
  DATE_FORMAT.format(new Date(`${isoDate}T00:00:00Z`));

function describeNetwork(network: Network): ShowFact {
  const term = network.kind === 'network' ? 'Network' : 'Web channel';

  return { term, description: network.name };
}

/** `Thursday at 22:00`, `Monday, Tuesday`, or `21:00` when TVmaze lists no day. */
function describeSchedule(schedule: Schedule): string {
  const days = schedule.days.join(', ');

  if (days === '') {
    return schedule.time;
  }

  if (schedule.time === '') {
    return days;
  }

  return `${days} at ${schedule.time}`;
}
