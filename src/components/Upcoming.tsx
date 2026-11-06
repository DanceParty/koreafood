import { useComputed } from "@preact/signals";
import { upcoming } from "../lib/client-data.ts";
import { shortDate } from "../lib/dates.ts";
import { settledDay } from "../lib/store.ts";

const KIND_LABEL = { law: "Legal", term: "Solar term", holiday: "Calendar", market: "Market day", festival: "Festival" } as const;

export function Upcoming() {
  const list = useComputed(() => upcoming(settledDay.value, 8));
  return (
    <section class="upcoming" aria-labelledby="upcoming-title">
      <h2 id="upcoming-title"><span lang="ko">다가오는 날</span> Coming up</h2>
      <ol class="tickets">
        {list.value.map(({ event, on }) => {
          const away = on - settledDay.value;
          const first = event.foods[0];
          const body = (
            <>
              <span class="ticket-d">{away === 0 ? "D-DAY" : `D-${away}`}</span>
              <span class="ticket-date">{shortDate(on)} · {KIND_LABEL[event.kind]}</span>
              <span class="ticket-ko" lang="ko">{event.ko}</span>
              <span class="ticket-en">{event.en}</span>
            </>
          );
          return <li key={event.id + on}>{first ? <a class="ticket" href={`/food/${first}/`}>{body}</a> : <div class="ticket">{body}</div>}</li>;
        })}
      </ol>
      <p class="ics"><a href="/calendar.ics">Add these dates to your calendar</a></p>
    </section>
  );
}
