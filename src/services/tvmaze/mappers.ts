import {
  type DetailPoster,
  type Network,
  type Show,
  type ShowDetail,
  toShowId,
} from '@/domain/show';
import type { ShowDto, ShowListItemDto } from '@/services/tvmaze/schema';

/** Turns a validated list item into the list model; nullables become explicit domain values. */
export const mapShow = (dto: ShowListItemDto): Show => ({
  id: toShowId(dto.id),
  name: dto.name,
  genres: dto.genres,
  rating: dto.rating.average,
  poster: dto.image === null ? null : { medium: dto.image.medium },
  premiered: dto.premiered,
});

export const mapShowDetail = (dto: ShowDto): ShowDetail => ({
  ...mapShow(dto),
  poster: mapDetailPoster(dto),
  summaryHtml: dto.summary,
  ended: dto.ended,
  status: dto.status,
  language: dto.language,
  runtimeMinutes: dto.runtime ?? dto.averageRuntime,
  network: mapNetwork(dto),
  schedule: { time: dto.schedule.time, days: dto.schedule.days },
  url: dto.url,
});

/** The detail page is the only view that loads the original image. */
function mapDetailPoster(dto: ShowDto): DetailPoster | null {
  if (dto.image === null) {
    return null;
  }

  return { medium: dto.image.medium, original: dto.image.original };
}

/** A broadcast network wins over a web channel when TVmaze lists both. */
function mapNetwork(dto: ShowDto): Network | null {
  if (dto.network !== null) {
    return { name: dto.network.name, kind: 'network' };
  }

  if (dto.webChannel !== null) {
    return { name: dto.webChannel.name, kind: 'web-channel' };
  }

  return null;
}
