import type { Member, Rental } from "../types";
import { getRentalStatusLabel } from "./rentalStatus";

const DEFAULT_APP_URL = "https://lapetitemaison.guillaumebraillon.fr";
const HOUSE_ADDRESS = "235 Rte Patrick Zedda, 83500 La Seyne-sur-Mer";

export interface CalendarAttendee {
  email: string;
  name?: string;
}

export interface CalendarEventPayload {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location?: string;
  attendees?: CalendarAttendee[];
  url?: string;
  uid?: string;
}

interface BuildRentalCalendarEventInput {
  rental: Rental;
  owner?: Pick<Member, "firstName" | "lastName" | "email">;
  subMember?: {
    label?: string;
    firstName?: string;
    lastName?: string;
  };
  appUrl?: string;
  functionsBaseUrl?: string;
}

const slugifyForFilename = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

const getFunctionsBaseUrl = (override?: string): string | null => {
  if (override) return override;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (!supabaseUrl) return null;
  try {
    const parsed = new URL(supabaseUrl);
    const host = parsed.hostname;
    const projectRef = host.split(".")[0];
    if (!projectRef) return null;
    return `https://${projectRef}.functions.supabase.co`;
  } catch {
    return null;
  }
};

const toGoogleDateTime = (isoDate: string): string =>
  new Date(isoDate)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");

const toIcsDateTime = (isoDate: string): string =>
  new Date(isoDate)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");

const escapeIcsText = (value: string): string => value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");

const buildDisplayName = (
  owner?: Pick<Member, "firstName" | "lastName">,
  subMember?: {
    label?: string;
    firstName?: string;
    lastName?: string;
  }
): string => {
  if (subMember?.label) return subMember.label;
  if (subMember?.firstName && subMember?.lastName) return `${subMember.firstName} ${subMember.lastName}`;
  if (owner) return `${owner.firstName} ${owner.lastName}`;
  return "Location";
};

export const buildRentalCalendarEvent = ({ rental, owner, subMember, appUrl = DEFAULT_APP_URL }: BuildRentalCalendarEventInput): CalendarEventPayload => {
  const displayName = buildDisplayName(owner, subMember);
  const ownerLabel = owner ? `${owner.firstName} ${owner.lastName}` : "";
  const statusLabel = getRentalStatusLabel(rental.status);
  const rentalUrl = `${appUrl}?view=rentals&status=${rental.status}`;
  const title = `La Petite Maison - ${displayName}`;
  const details: string[] = [
    `Reservation: ${displayName}`,
    ...(ownerLabel && displayName !== ownerLabel ? [`Proprietaire: ${ownerLabel}`] : []),
    `Personnes: ${rental.guestCount}`,
    `Statut: ${statusLabel}`,
    `Tarif location: ${rental.price.toFixed(2)} EUR`,
    `Voir dans l'application: ${rentalUrl}`,
  ];

  if (rental.notes) {
    details.push(`Notes: ${rental.notes}`);
  }

  const attendees: CalendarAttendee[] = [];
  if (subMember && owner?.email) {
    attendees.push({
      email: owner.email,
      name: ownerLabel || undefined,
    });
  }

  return {
    title,
    description: details.join("\n"),
    startDate: rental.startDate,
    endDate: rental.endDate,
    location: HOUSE_ADDRESS,
    attendees,
    url: rentalUrl,
    uid: `rental-${rental.id}@lapetitemaison`,
  };
};

export const buildGoogleCalendarLink = (event: CalendarEventPayload): string => {
  const baseUrl = "https://calendar.google.com/calendar/render?action=TEMPLATE";
  const params = new URLSearchParams({
    text: event.title,
    details: event.description,
    dates: `${toGoogleDateTime(event.startDate)}/${toGoogleDateTime(event.endDate)}`,
  });

  if (event.location) {
    params.set("location", event.location);
  }

  if (event.attendees && event.attendees.length > 0) {
    params.set("add", event.attendees.map((attendee) => attendee.email).join(","));
  }

  return `${baseUrl}&${params.toString()}`;
};

export const buildIcsContent = (event: CalendarEventPayload): string => {
  const uid = event.uid ?? `${Date.now()}@lapetitemaison`;
  const dtStamp = toIcsDateTime(new Date().toISOString());
  const dtStart = toIcsDateTime(event.startDate);
  const dtEnd = toIcsDateTime(event.endDate);

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//La Petite Maison//Reservations//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeIcsText(uid)}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(event.description)}`,
    ...(event.location ? [`LOCATION:${escapeIcsText(event.location)}`] : []),
    ...(event.attendees && event.attendees.length > 0
      ? event.attendees.map((attendee) => {
          const attendeeEmail = `MAILTO:${attendee.email}`;
          const common = "CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE";
          if (attendee.name) {
            return `ATTENDEE;${common};CN=${escapeIcsText(attendee.name)}:${attendeeEmail}`;
          }
          return `ATTENDEE;${common}:${attendeeEmail}`;
        })
      : []),
    ...(event.url ? [`URL:${escapeIcsText(event.url)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
};

export const buildRentalGoogleCalendarLink = (input: BuildRentalCalendarEventInput): string => buildGoogleCalendarLink(buildRentalCalendarEvent(input));

export const buildRentalIcsFilename = (input: BuildRentalCalendarEventInput): string => {
  const event = buildRentalCalendarEvent(input);
  const start = new Date(event.startDate).toISOString().slice(0, 10);
  const title = slugifyForFilename(event.title) || "reservation";
  return `${title}-${start}.ics`;
};

export const buildRentalIcsDataUrl = (input: BuildRentalCalendarEventInput): string => {
  const event = buildRentalCalendarEvent(input);
  const icsContent = buildIcsContent(event);
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;
};

export const buildRentalIcsPublicUrl = (input: BuildRentalCalendarEventInput): string | null => {
  const baseUrl = getFunctionsBaseUrl(input.functionsBaseUrl);
  if (!baseUrl) return null;

  const event = buildRentalCalendarEvent(input);
  const params = new URLSearchParams({
    title: event.title,
    description: event.description,
    startDate: event.startDate,
    endDate: event.endDate,
    filename: buildRentalIcsFilename(input),
  });

  if (event.location) {
    params.set("location", event.location);
  }
  if (event.url) {
    params.set("url", event.url);
  }
  if (event.attendees && event.attendees.length > 0) {
    params.set("attendees", event.attendees.map((attendee) => attendee.email).join(","));
  }

  return `${baseUrl}/calendar-ics?${params.toString()}`;
};
