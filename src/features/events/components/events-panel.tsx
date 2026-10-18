"use client";

import { CalendarDaysIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { useErrorMessage } from "@/components/forms/use-error-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Tables } from "@/lib/supabase/types";
import { todayInTimeZone, utcToWallTime } from "@/lib/timezone";
import { createEvent, deleteEvent, updateEvent } from "../actions";
import type { EventInput } from "../schema";
import { allDayLastDate } from "../times";
import { EventForm } from "./event-form";

type Event = Pick<
  Tables<"events">,
  | "id"
  | "title"
  | "description"
  | "location"
  | "starts_at"
  | "ends_at"
  | "all_day"
  | "color"
  | "visible_to_guardians"
  | "course_id"
> & { courseName: string | null };

export function EventsPanel({
  schoolId,
  timezone,
  courses,
  events,
}: {
  schoolId: string;
  timezone: string;
  courses: { id: string; name: string }[];
  events: Event[];
}) {
  const t = useTranslations("events"),
    common = useTranslations("common"),
    format = useFormatter();
  const errorMessage = useErrorMessage();
  const [editing, setEditing] = useState<Event | "new" | null>(null);
  const defaults: EventInput =
    editing && editing !== "new"
      ? {
          ...editing,
          starts_at: utcToWallTime(editing.starts_at, timezone).slice(
            0,
            editing.all_day ? 10 : 16,
          ),
          ends_at: editing.ends_at
            ? editing.all_day
              ? allDayLastDate(editing.ends_at, timezone)
              : utcToWallTime(editing.ends_at, timezone)
            : "",
        }
      : {
          title: "",
          description: "",
          location: "",
          starts_at: `${todayInTimeZone(timezone)}T09:00`,
          ends_at: "",
          all_day: false,
          color: "",
          course_id: "",
          visible_to_guardians: false,
        };
  return (
    <div className="space-y-4">
      <Button onClick={() => setEditing("new")}>{t("newEvent")}</Button>
      {events.length === 0 ? (
        <EmptyState icon={CalendarDaysIcon} title={t("empty")} />
      ) : (
        events.map((event) => (
          <Card key={event.id}>
            <CardHeader className="flex-row justify-between gap-4">
              <div className="space-y-2">
                <CardTitle>{event.title}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {format.dateTime(new Date(event.starts_at), {
                    dateStyle: "medium",
                    ...(event.all_day ? {} : { timeStyle: "short" }),
                    timeZone: timezone,
                  })}
                  {event.ends_at
                    ? ` – ${format.dateTime(new Date(event.all_day ? `${allDayLastDate(event.ends_at, timezone)}T00:00:00Z` : event.ends_at), { dateStyle: "medium", ...(event.all_day ? {} : { timeStyle: "short" }), timeZone: event.all_day ? "UTC" : timezone })}`
                    : ""}
                </p>
              </div>
              <Badge variant="outline">
                {event.visible_to_guardians
                  ? t("visibleToParents")
                  : t("staffOnly")}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {[event.courseName ?? t("schoolWide"), event.location]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {event.description ? (
                <p className="whitespace-pre-wrap text-sm">
                  {event.description}
                </p>
              ) : null}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditing(event)}>
                  {common("edit")}
                </Button>
                <ConfirmDialog
                  trigger={<Button variant="ghost">{common("delete")}</Button>}
                  title={t("deleteTitle")}
                  description={t("deleteDescription")}
                  onConfirm={async () => {
                    const result = await deleteEvent(schoolId, event.id);
                    if (!result.ok) toast.error(errorMessage(result.error));
                    return result.ok;
                  }}
                />
              </div>
            </CardContent>
          </Card>
        ))
      )}
      <Dialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editing === "new" ? t("newEvent") : t("editEvent")}
            </DialogTitle>
            <DialogDescription>
              {t("timezoneHint", { timezone })}
            </DialogDescription>
          </DialogHeader>
          {editing ? (
            <EventForm
              key={editing === "new" ? "new" : editing.id}
              defaults={defaults}
              courses={courses}
              action={
                editing === "new"
                  ? createEvent.bind(null, schoolId)
                  : updateEvent.bind(null, schoolId, editing.id)
              }
              onSaved={() => setEditing(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
