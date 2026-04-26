import {
  type DragEvent,
  type FormEvent,
  type ReactNode,
  useMemo,
  useState,
} from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  CalendarDays,
  Clock,
  MapPin,
  Pencil,
  Trash2,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "../convex/_generated/api";
import type { Doc, Id } from "../convex/_generated/dataModel";

type EventDoc = Doc<"events">;
type EventWithOrganizer = EventDoc & {
  organizer: {
    _id: Id<"users">;
    name?: string;
    email?: string;
    image?: string;
  } | null;
};
type RsvpStatus = "yes" | "no" | "maybe";
type EventFormState = {
  title: string;
  description: string;
  location: string;
  startTime: string;
  endTime: string;
  capacity: string;
};

const statusCopy: Record<RsvpStatus, string> = {
  yes: "Going",
  no: "Not going",
  maybe: "Maybe",
};

export function EventFeed() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.events.listUpcoming,
    {},
    { initialNumItems: 6 },
  );
  const events = results as EventWithOrganizer[];

  return (
    <PageShell
      kicker="Upcoming"
      title="Events that need a headcount."
      description="Browse chapter programming, RSVP quickly, and keep the attendee list current."
      action={
        <Button asChild variant="secondary">
          <Link to="/calendar">
            <CalendarDays className="size-4" />
            Month view
          </Link>
        </Button>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        {events.map((event) => (
          <EventCard key={event._id} event={event} />
        ))}
      </div>
      {events.length === 0 && status === "Exhausted" ? (
        <EmptyState message="No upcoming events yet. Organizers can create the first one." />
      ) : null}
      <div className="mt-8 flex justify-center">
        {status === "CanLoadMore" ? (
          <Button type="button" onClick={() => loadMore(6)}>
            Load more
          </Button>
        ) : null}
        {status === "LoadingFirstPage" || status === "LoadingMore" ? (
          <p className="text-sm text-stone-500">Loading events...</p>
        ) : null}
      </div>
    </PageShell>
  );
}

export function CalendarView() {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [draggedEventId, setDraggedEventId] = useState<Id<"events"> | null>(
    null,
  );
  const [optimisticMoves, setOptimisticMoves] = useState<
    Record<string, Pick<EventDoc, "startTime" | "endTime">>
  >({});
  const [moveError, setMoveError] = useState<string | null>(null);
  const user = useQuery(api.users.me, {});
  const moveEventToDay = useMutation(api.events.moveToDay);
  const queriedEvents = useQuery(api.events.listForMonth, {
    year: cursor.getFullYear(),
    month: cursor.getMonth(),
  });
  const events = useMemo(
    () => (queriedEvents ?? []) as EventWithOrganizer[],
    [queriedEvents],
  );
  const visibleEvents = useMemo(
    () =>
      events.map((event) =>
        optimisticMoves[event._id]
          ? { ...event, ...optimisticMoves[event._id] }
          : event,
      ),
    [events, optimisticMoves],
  );
  const days = useMemo(() => buildCalendarDays(cursor), [cursor]);
  const selectedEvents = selectedDay
    ? visibleEvents.filter((event) =>
        isSameDay(new Date(event.startTime), selectedDay),
      )
    : [];
  const canDragEvents = user?.role === "organizer";

  function canMoveEvent(event: EventWithOrganizer) {
    return canDragEvents && event.createdBy === user?._id;
  }

  async function handleDrop(dropEvent: DragEvent<HTMLDivElement>, day: Date) {
    dropEvent.preventDefault();

    if (!canDragEvents) {
      return;
    }

    const eventId = dropEvent.dataTransfer.getData(
      "text/plain",
    ) as Id<"events">;
    const event = visibleEvents.find((row) => row._id === eventId);

    if (
      !event ||
      !canMoveEvent(event) ||
      isSameDay(new Date(event.startTime), day)
    ) {
      setDraggedEventId(null);
      return;
    }

    const optimisticTimes = moveEventTimesToDay(event, day);
    setMoveError(null);
    setOptimisticMoves((current) => ({
      ...current,
      [eventId]: optimisticTimes,
    }));

    try {
      await moveEventToDay({ eventId, day: dayStartTimestamp(day) });
    } catch (caught) {
      setOptimisticMoves((current) => {
        const next = { ...current };
        delete next[eventId];
        return next;
      });
      setMoveError(
        caught instanceof Error ? caught.message : "Unable to move event.",
      );
    } finally {
      setDraggedEventId(null);
    }
  }

  return (
    <PageShell
      kicker="Calendar"
      title={cursor.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })}
      description="A dense month grid for planning around the chapter schedule."
      action={
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setCursor(
                new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1),
              )
            }
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setCursor(startOfMonth(new Date()))}
          >
            Today
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setCursor(
                new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1),
              )
            }
          >
            Next
          </Button>
        </div>
      }
    >
      <div className="overflow-hidden rounded-[1.75rem] border border-stone-200 bg-white shadow-sm">
        <div className="grid grid-cols-7 border-b border-stone-200 bg-stone-50 text-center text-xs font-bold uppercase tracking-[0.2em] text-stone-500">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="px-2 py-3">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const dayEvents = visibleEvents.filter((event) =>
              isSameDay(new Date(event.startTime), day),
            );
            const isCurrentMonth = day.getMonth() === cursor.getMonth();
            const isDropTarget = canDragEvents && draggedEventId !== null;
            return (
              <div
                key={day.toISOString()}
                role="button"
                tabIndex={0}
                className={cn(
                  "min-h-32 border-b border-r border-stone-100 p-2 text-left transition hover:bg-amber-50",
                  !isCurrentMonth && "bg-stone-50 text-stone-400",
                  isDropTarget &&
                    "outline outline-2 -outline-offset-2 outline-amber-900/20",
                )}
                onClick={() => setSelectedDay(day)}
                onDragOver={(dragOverEvent) => {
                  if (canDragEvents) {
                    dragOverEvent.preventDefault();
                  }
                }}
                onDrop={(dropEvent) => void handleDrop(dropEvent, day)}
                onKeyDown={(keyEvent) => {
                  if (keyEvent.key === "Enter" || keyEvent.key === " ") {
                    keyEvent.preventDefault();
                    setSelectedDay(day);
                  }
                }}
              >
                <span
                  className={cn(
                    "inline-grid size-7 place-items-center rounded-full text-sm font-bold",
                    isSameDay(day, new Date()) && "bg-amber-900 text-white",
                  )}
                >
                  {day.getDate()}
                </span>
                <div className="mt-2 space-y-1">
                  {dayEvents.slice(0, 3).map((event) => (
                    <Link
                      key={event._id}
                      to="/events/$eventId"
                      params={{ eventId: event._id }}
                      draggable={canMoveEvent(event)}
                      className={cn(
                        "block truncate rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-950 hover:bg-amber-200",
                        canMoveEvent(event) &&
                          "cursor-grab active:cursor-grabbing",
                        draggedEventId === event._id && "opacity-50",
                      )}
                      onDragStart={(dragStartEvent) => {
                        if (!canMoveEvent(event)) {
                          dragStartEvent.preventDefault();
                          return;
                        }

                        setDraggedEventId(event._id);
                        dragStartEvent.dataTransfer.effectAllowed = "move";
                        dragStartEvent.dataTransfer.setData(
                          "text/plain",
                          event._id,
                        );
                      }}
                      onDragEnd={() => setDraggedEventId(null)}
                      onClick={(eventClick) => eventClick.stopPropagation()}
                    >
                      {event.title}
                    </Link>
                  ))}
                  {dayEvents.length > 3 ? (
                    <span className="block text-xs font-semibold text-stone-500">
                      +{dayEvents.length - 3} more
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {moveError ? (
        <p className="mt-3 text-sm font-semibold text-red-700">{moveError}</p>
      ) : null}
      {canDragEvents ? (
        <p className="mt-3 text-sm text-stone-500">
          Drag your events to a different day to reschedule them without
          changing the time.
        </p>
      ) : null}
      {selectedDay ? (
        <section className="mt-6 rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-stone-950">
            {selectedDay.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </h2>
          <div className="mt-4 grid gap-3">
            {selectedEvents.map((event) => (
              <EventCard key={event._id} event={event} compact />
            ))}
            {selectedEvents.length === 0 ? (
              <p className="text-sm text-stone-500">No events on this day.</p>
            ) : null}
          </div>
        </section>
      ) : null}
    </PageShell>
  );
}

export function EventDetailPage() {
  const { eventId } = useParams({ strict: false }) as {
    eventId: Id<"events">;
  };
  const navigate = useNavigate();
  const user = useQuery(api.users.me, {});
  const event = useQuery(api.events.getById, { eventId }) as
    | EventWithOrganizer
    | null
    | undefined;
  const attendees = (useQuery(api.rsvps.listForEvent, { eventId }) ??
    []) as Array<Doc<"rsvps"> & { user: Doc<"users"> | null }>;
  const removeEvent = useMutation(api.events.remove);

  if (event === undefined || user === undefined) {
    return <LoadingPage label="Loading event..." />;
  }

  if (!event) {
    return <EmptyPage title="Event not found." />;
  }

  const yesCount = attendees.filter((rsvp) => rsvp.status === "yes").length;
  const canManage = user?.role === "organizer" && event.createdBy === user._id;

  return (
    <PageShell
      kicker={event.isCancelled ? "Cancelled" : "Event detail"}
      title={event.title}
      description={event.description}
      action={
        canManage ? (
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link to="/events/$eventId/edit" params={{ eventId }}>
                <Pencil className="size-4" />
                Edit
              </Link>
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                void removeEvent({ eventId }).then(() => navigate({ to: "/" }));
              }}
            >
              <Trash2 className="size-4" />
              Delete
            </Button>
          </div>
        ) : null
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <section className="rounded-[1.75rem] border border-stone-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 text-stone-700 sm:grid-cols-2 xl:grid-cols-4">
            <InfoPill
              icon={<Clock className="size-4" />}
              label={formatDateRange(event)}
            />
            <InfoPill
              icon={<MapPin className="size-4" />}
              label={event.location}
            />
            <InfoPill
              icon={<UsersRound className="size-4" />}
              label={
                event.capacity
                  ? `${yesCount}/${event.capacity} going`
                  : `${yesCount} going`
              }
            />
            <InfoPill
              icon={<UserRound className="size-4" />}
              label={`By ${organizerName(event)}`}
            />
          </div>
          <RsvpWidget event={event} attendees={attendees} />
        </section>
        <section className="rounded-[1.75rem] border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black text-stone-950">Attendees</h2>
          <div className="mt-4 space-y-3">
            {attendees.map((rsvp) => (
              <div
                key={rsvp._id}
                className="flex items-center justify-between rounded-2xl bg-stone-50 p-3"
              >
                <div>
                  <p className="font-bold text-stone-900">
                    {rsvp.user?.name ?? "Chapter member"}
                  </p>
                  {rsvp.note ? (
                    <p className="text-sm text-stone-500">{rsvp.note}</p>
                  ) : null}
                </div>
                <StatusBadge status={rsvp.status} />
              </div>
            ))}
            {attendees.length === 0 ? (
              <p className="text-sm text-stone-500">No RSVPs yet.</p>
            ) : null}
          </div>
        </section>
      </div>
    </PageShell>
  );
}

export function EventFormPage({ mode }: { mode: "create" | "edit" }) {
  const { eventId } = useParams({ strict: false }) as {
    eventId?: Id<"events">;
  };
  const user = useQuery(api.users.me, {});
  const event = useQuery(
    api.events.getById,
    mode === "edit" && eventId ? { eventId } : "skip",
  ) as EventWithOrganizer | null | undefined;

  if (user === undefined || (mode === "edit" && event === undefined)) {
    return <LoadingPage label="Loading form..." />;
  }

  if (!user || user.role !== "organizer") {
    return <EmptyPage title="Organizer access is required." />;
  }

  if (mode === "edit" && (!event || event.createdBy !== user._id || !eventId)) {
    return <EmptyPage title="Only the event creator can edit this event." />;
  }

  return (
    <EventFormCard
      key={event?._id ?? "new"}
      mode={mode}
      eventId={eventId}
      initialForm={event ? formFromEvent(event) : undefined}
    />
  );
}

function EventFormCard({
  mode,
  eventId,
  initialForm,
}: {
  mode: "create" | "edit";
  eventId?: Id<"events">;
  initialForm?: EventFormState;
}) {
  const navigate = useNavigate();
  const createEvent = useMutation(api.events.create);
  const updateEvent = useMutation(api.events.update);
  const [form, setForm] = useState(() => initialForm ?? emptyEventForm());
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    setError(null);

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      location: form.location.trim(),
      startTime: new Date(form.startTime).getTime(),
      endTime: new Date(form.endTime).getTime(),
      capacity: form.capacity ? Number(form.capacity) : undefined,
    };

    try {
      if (mode === "create") {
        const newEventId = await createEvent(payload);
        await navigate({
          to: "/events/$eventId",
          params: { eventId: newEventId },
        });
      } else if (eventId) {
        await updateEvent({ eventId, ...payload });
        await navigate({ to: "/events/$eventId", params: { eventId } });
      }
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to save event.",
      );
    }
  }

  return (
    <PageShell
      kicker={mode === "create" ? "Organizer" : "Manage"}
      title={mode === "create" ? "Create an event." : "Edit event."}
      description="Keep dates, capacity, and location precise so RSVPs stay useful."
    >
      <form
        onSubmit={(submitEvent) => void handleSubmit(submitEvent)}
        className="mx-auto grid max-w-3xl gap-5 rounded-[1.75rem] border border-stone-200 bg-white p-6 shadow-sm"
      >
        <Field label="Title">
          <input
            required
            value={form.title}
            onChange={(event) =>
              setForm({ ...form, title: event.target.value })
            }
            className={inputClassName}
          />
        </Field>
        <Field label="Description">
          <textarea
            required
            rows={5}
            value={form.description}
            onChange={(event) =>
              setForm({ ...form, description: event.target.value })
            }
            className={inputClassName}
          />
        </Field>
        <Field label="Location">
          <input
            required
            value={form.location}
            onChange={(event) =>
              setForm({ ...form, location: event.target.value })
            }
            className={inputClassName}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Start time">
            <input
              required
              type="datetime-local"
              value={form.startTime}
              onChange={(event) =>
                setForm({ ...form, startTime: event.target.value })
              }
              className={inputClassName}
            />
          </Field>
          <Field label="End time">
            <input
              required
              type="datetime-local"
              value={form.endTime}
              onChange={(event) =>
                setForm({ ...form, endTime: event.target.value })
              }
              className={inputClassName}
            />
          </Field>
        </div>
        <Field label="Capacity (optional)">
          <input
            min={1}
            type="number"
            value={form.capacity}
            onChange={(event) =>
              setForm({ ...form, capacity: event.target.value })
            }
            className={inputClassName}
          />
        </Field>
        {error ? (
          <p className="text-sm font-semibold text-red-700">{error}</p>
        ) : null}
        <Button type="submit" size="lg">
          {mode === "create" ? "Create event" : "Save changes"}
        </Button>
      </form>
    </PageShell>
  );
}

export function ProfilePage() {
  const user = useQuery(api.users.me, {});
  const rsvps = useQuery(api.rsvps.listMine, {}) as
    | Array<Doc<"rsvps"> & { event: EventDoc | null }>
    | undefined;
  const [now] = useState(() => Date.now());
  const upcoming = (rsvps ?? []).filter(
    (rsvp) => (rsvp.event?.startTime ?? 0) >= now,
  );
  const past = (rsvps ?? []).filter(
    (rsvp) => (rsvp.event?.startTime ?? 0) < now,
  );

  if (user === undefined || rsvps === undefined) {
    return <LoadingPage label="Loading profile..." />;
  }

  return (
    <PageShell
      kicker="Profile"
      title={user?.name ?? "Chapter member"}
      description={`Role: ${user?.role ?? "member"}. Review your upcoming and past RSVPs.`}
    >
      <RsvpList title="Upcoming RSVPs" rows={upcoming} />
      <RsvpList title="Past RSVPs" rows={past} />
    </PageShell>
  );
}

function RsvpWidget({
  event,
  attendees,
}: {
  event: EventDoc;
  attendees: Array<Doc<"rsvps"> & { user: Doc<"users"> | null }>;
}) {
  const user = useQuery(api.users.me, {});
  const mine = attendees.find((rsvp) => rsvp.userId === user?._id);

  return <RsvpWidgetForm key={mine?._id ?? "new"} event={event} mine={mine} />;
}

function RsvpWidgetForm({
  event,
  mine,
}: {
  event: EventDoc;
  mine?: Doc<"rsvps"> & { user: Doc<"users"> | null };
}) {
  const upsert = useMutation(api.rsvps.upsert);
  const remove = useMutation(api.rsvps.remove);
  const [status, setStatus] = useState<RsvpStatus>(mine?.status ?? "yes");
  const [note, setNote] = useState(mine?.note ?? "");
  const [error, setError] = useState<string | null>(null);

  async function saveRsvp(nextStatus = status) {
    setError(null);
    setStatus(nextStatus);

    try {
      await upsert({
        eventId: event._id,
        status: nextStatus,
        note: note.trim() || undefined,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to RSVP.");
    }
  }

  return (
    <div className="mt-8 rounded-[1.5rem] bg-amber-50 p-5">
      <h2 className="text-lg font-black text-stone-950">Your RSVP</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {(["yes", "maybe", "no"] as const).map((option) => (
          <Button
            key={option}
            type="button"
            variant={status === option ? "default" : "outline"}
            onClick={() => void saveRsvp(option)}
          >
            {statusCopy[option]}
          </Button>
        ))}
      </div>
      <textarea
        value={note}
        onChange={(noteEvent) => setNote(noteEvent.target.value)}
        placeholder="Optional note, e.g. bringing a friend"
        rows={3}
        className={cn(inputClassName, "mt-4 bg-white")}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" onClick={() => void saveRsvp()}>
          Save note
        </Button>
        {mine ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => void remove({ rsvpId: mine._id })}
          >
            Delete RSVP
          </Button>
        ) : null}
      </div>
      {error ? (
        <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>
      ) : null}
    </div>
  );
}

function EventCard({
  event,
  compact = false,
}: {
  event: EventWithOrganizer;
  compact?: boolean;
}) {
  return (
    <Link
      to="/events/$eventId"
      params={{ eventId: event._id }}
      className={cn(
        "group block rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-900/30 hover:shadow-lg",
        compact && "rounded-2xl p-4",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black tracking-tight text-stone-950 group-hover:text-amber-950">
            {event.title}
          </h2>
          <p className="mt-2 line-clamp-2 text-sm text-stone-600">
            {event.description}
          </p>
        </div>
        {event.capacity ? (
          <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-600">
            cap {event.capacity}
          </span>
        ) : null}
      </div>
      <div className="mt-4 grid gap-2 text-sm text-stone-600">
        <span className="flex items-center gap-2">
          <Clock className="size-4 text-amber-900" />
          {formatDateRange(event)}
        </span>
        <span className="flex items-center gap-2">
          <MapPin className="size-4 text-amber-900" />
          {event.location}
        </span>
        <span className="flex items-center gap-2">
          <UserRound className="size-4 text-amber-900" />
          Organized by {organizerName(event)}
        </span>
      </div>
    </Link>
  );
}

function RsvpList({
  title,
  rows,
}: {
  title: string;
  rows: Array<Doc<"rsvps"> & { event: EventDoc | null }>;
}) {
  return (
    <section className="mb-6 rounded-[1.75rem] border border-stone-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black text-stone-950">{title}</h2>
      <div className="mt-4 grid gap-3">
        {rows.map((rsvp) =>
          rsvp.event ? (
            <Link
              key={rsvp._id}
              to="/events/$eventId"
              params={{ eventId: rsvp.event._id }}
              className="flex flex-col gap-2 rounded-2xl bg-stone-50 p-4 transition hover:bg-amber-50 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-bold text-stone-950">{rsvp.event.title}</p>
                <p className="text-sm text-stone-500">
                  {formatDateRange(rsvp.event)}
                </p>
              </div>
              <StatusBadge status={rsvp.status} />
            </Link>
          ) : null,
        )}
        {rows.length === 0 ? (
          <p className="text-sm text-stone-500">Nothing here yet.</p>
        ) : null}
      </div>
    </section>
  );
}

function PageShell({
  kicker,
  title,
  description,
  action,
  children,
}: {
  kicker: string;
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.3em] text-amber-900">
            {kicker}
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-tight text-stone-950 sm:text-6xl">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-stone-600">{description}</p>
        </div>
        {action}
      </section>
      {children}
    </main>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-stone-700">
      {label}
      {children}
    </label>
  );
}

function InfoPill({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-stone-50 px-3 py-3 text-sm font-semibold">
      {icon}
      {label}
    </div>
  );
}

function StatusBadge({ status }: { status: RsvpStatus }) {
  return (
    <span
      className={cn(
        "w-fit rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.16em]",
        status === "yes" && "bg-emerald-100 text-emerald-800",
        status === "maybe" && "bg-amber-100 text-amber-900",
        status === "no" && "bg-stone-200 text-stone-600",
      )}
    >
      {statusCopy[status]}
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-stone-300 bg-white/70 p-8 text-center text-stone-500">
      {message}
    </div>
  );
}

function LoadingPage({ label }: { label: string }) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-16 text-stone-500 sm:px-6 lg:px-8">
      {label}
    </main>
  );
}

function EmptyPage({ title }: { title: string }) {
  return (
    <main className="mx-auto grid min-h-[60vh] max-w-3xl place-items-center px-4 text-center">
      <div className="rounded-[2rem] border border-stone-200 bg-white p-10 shadow-sm">
        <h1 className="text-3xl font-black tracking-tight text-stone-950">
          {title}
        </h1>
        <Button asChild className="mt-6">
          <Link to="/">Back to events</Link>
        </Button>
      </div>
    </main>
  );
}

function emptyEventForm() {
  const start = Date.now() + 24 * 60 * 60 * 1000;
  return {
    title: "",
    description: "",
    location: "",
    startTime: toDateTimeLocal(start),
    endTime: toDateTimeLocal(start + 2 * 60 * 60 * 1000),
    capacity: "",
  };
}

function formFromEvent(event: EventDoc): EventFormState {
  return {
    title: event.title,
    description: event.description,
    location: event.location,
    startTime: toDateTimeLocal(event.startTime),
    endTime: toDateTimeLocal(event.endTime),
    capacity: event.capacity?.toString() ?? "",
  };
}

function organizerName(event: EventWithOrganizer) {
  return event.organizer?.name ?? event.organizer?.email ?? "Chapter organizer";
}

function formatDateRange(event: EventDoc) {
  const start = new Date(event.startTime);
  const end = new Date(event.endTime);
  return `${start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })}, ${start.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })} - ${end.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

function moveEventTimesToDay(event: EventDoc, day: Date) {
  const currentStart = new Date(event.startTime);
  const duration = event.endTime - event.startTime;
  const startTime = new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    currentStart.getHours(),
    currentStart.getMinutes(),
    currentStart.getSeconds(),
    currentStart.getMilliseconds(),
  ).getTime();

  return {
    startTime,
    endTime: startTime + duration,
  };
}

function dayStartTimestamp(day: Date) {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
}

function toDateTimeLocal(timestamp: number) {
  const date = new Date(timestamp);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function buildCalendarDays(month: Date) {
  const first = startOfMonth(month);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  const days = [];
  const cursor = new Date(start);

  while (days.length < 42) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

const inputClassName =
  "w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-base text-stone-950 outline-none transition focus:border-amber-900 focus:bg-white focus:ring-4 focus:ring-amber-900/10";
