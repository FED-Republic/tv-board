import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ShowDetail } from '@/domain/show';
import type { ShowFact } from '@/domain/show-facts';
import { describeShow } from '@/domain/show-facts';
import { aShowDetail } from '../components/builders';

const UNDER_THE_DOME = aShowDetail({
  name: 'Under the Dome',
  genres: ['Drama', 'Science-Fiction', 'Thriller'],
  rating: 6.5,
  premiered: '2013-06-24',
  ended: '2015-09-10',
  status: 'Ended',
  network: { name: 'CBS', kind: 'network' },
  schedule: { time: '22:00', days: ['Thursday'] },
});

type ShowDraft = Partial<Omit<ShowDetail, 'id'>>;

const aShow = (draft: ShowDraft): ShowDetail => ({ ...UNDER_THE_DOME, ...draft });

const termsOf = (facts: readonly ShowFact[]): readonly string[] => facts.map((fact) => fact.term);

function descriptionFor(facts: readonly ShowFact[], term: string): string | undefined {
  return facts.find((fact) => fact.term === term)?.description;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('describeShow', () => {
  describe('when every detail is known', () => {
    it('given a complete show, when described, then it lists the six facts in order', () => {
      expect(describeShow(UNDER_THE_DOME)).toEqual([
        { term: 'Status', description: 'Ended' },
        { term: 'Premiered', description: '24 Jun 2013' },
        { term: 'Language', description: 'English' },
        { term: 'Runtime', description: '60 min' },
        { term: 'Network', description: 'CBS' },
        { term: 'Schedule', description: 'Thursday at 22:00' },
      ]);
    });

    it('given a runtime of 30 minutes, when described, then the unit is appended', () => {
      const shortShow = aShow({ runtimeMinutes: 30 });

      expect(descriptionFor(describeShow(shortShow), 'Runtime')).toBe('30 min');
    });
  });

  describe('when the process runs west of UTC', () => {
    it('given a premiere on New Year, when described, then the date does not shift a day', () => {
      vi.stubEnv('TZ', 'America/New_York');
      const newYearShow = aShow({ premiered: '2013-01-01' });

      expect(descriptionFor(describeShow(newYearShow), 'Premiered')).toBe('1 Jan 2013');
    });
  });

  describe('when optional details are missing', () => {
    it('given a show with no optional detail, when described, then only the status is listed', () => {
      const bareShow = aShow({
        premiered: null,
        language: null,
        runtimeMinutes: null,
        network: null,
        schedule: { time: '', days: [] },
      });

      expect(describeShow(bareShow)).toEqual([{ term: 'Status', description: 'Ended' }]);
    });

    it('given a show that never premiered, when described, then no premiere is listed', () => {
      const upcomingShow = aShow({ premiered: null });

      expect(termsOf(describeShow(upcomingShow))).not.toContain('Premiered');
    });

    it('given a show with no language, when described, then no language is listed', () => {
      const silentShow = aShow({ language: null });

      expect(termsOf(describeShow(silentShow))).not.toContain('Language');
    });

    it('given a show with no runtime, when described, then no runtime is listed', () => {
      const untimedShow = aShow({ runtimeMinutes: null });

      expect(termsOf(describeShow(untimedShow))).not.toContain('Runtime');
    });
  });

  describe('when the show runs on a web channel', () => {
    it('given a web channel, when described, then the term reads Web channel', () => {
      const streamedShow = aShow({ network: { name: 'Netflix', kind: 'web-channel' } });

      expect(describeShow(streamedShow)).toContainEqual({
        term: 'Web channel',
        description: 'Netflix',
      });
    });

    it('given a web channel, when described, then no network fact is listed', () => {
      const streamedShow = aShow({ network: { name: 'Netflix', kind: 'web-channel' } });

      expect(termsOf(describeShow(streamedShow))).not.toContain('Network');
    });
  });

  describe('when the schedule is partial', () => {
    it('given two days and a time, when described, then the days are joined before the time', () => {
      const twiceWeekly = aShow({ schedule: { time: '10:00', days: ['Monday', 'Tuesday'] } });

      expect(descriptionFor(describeShow(twiceWeekly), 'Schedule')).toBe(
        'Monday, Tuesday at 10:00',
      );
    });

    it('given a day with no time, when described, then only the day is listed', () => {
      const untimedShow = aShow({ schedule: { time: '', days: ['Sunday'] } });

      expect(descriptionFor(describeShow(untimedShow), 'Schedule')).toBe('Sunday');
    });

    it('given a time with no day, when described, then only the time is listed', () => {
      const undatedShow = aShow({ schedule: { time: '21:00', days: [] } });

      expect(descriptionFor(describeShow(undatedShow), 'Schedule')).toBe('21:00');
    });
  });
});
