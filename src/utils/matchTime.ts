import type { Match } from "../data/mockWorldCup";

const venueTimeZones: Record<string, string> = {
  "Atlanta Stadium": "America/New_York",
  "Boston Stadium": "America/New_York",
  "BC Place Vancouver": "America/Vancouver",
  "Dallas Stadium": "America/Chicago",
  "Estadio Guadalajara": "America/Mexico_City",
  "Estadio Monterrey": "America/Monterrey",
  "Houston Stadium": "America/Chicago",
  "Kansas City Stadium": "America/Chicago",
  "Los Angeles Stadium": "America/Los_Angeles",
  "Mexico City Stadium": "America/Mexico_City",
  "Miami Stadium": "America/New_York",
  "Monterrey Stadium": "America/Monterrey",
  "New York New Jersey Stadium": "America/New_York",
  "Philadelphia Stadium": "America/New_York",
  "San Francisco Bay Area Stadium": "America/Los_Angeles",
  "Seattle Stadium": "America/Los_Angeles",
  "Toronto Stadium": "America/Toronto",
  "Vancouver Stadium": "America/Vancouver",
};

const getTimeZoneParts = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(date);

  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
};

const getTimeZoneOffset = (date: Date, timeZone: string) => {
  const parts = getTimeZoneParts(date, timeZone);
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );

  return asUtc - date.getTime();
};

const zonedTimeToUtc = (dateTime: string, timeZone: string) => {
  const [date = "", time = ""] = dateTime.split(" ");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const offset = getTimeZoneOffset(utcGuess, timeZone);
  const firstPass = new Date(utcGuess.getTime() - offset);
  const refinedOffset = getTimeZoneOffset(firstPass, timeZone);

  return new Date(utcGuess.getTime() - refinedOffset);
};

export const getVenueTimeZone = (venue: string) => venueTimeZones[venue] ?? "America/New_York";

export const getBeijingDateTime = (match: Match) => {
  const utcDate = zonedTimeToUtc(match.date, getVenueTimeZone(match.venue));
  const parts = getTimeZoneParts(utcDate, "Asia/Shanghai");
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const time = `${parts.hour}:${parts.minute}`;

  return {
    date,
    dateLabel: `${Number(parts.month)}/${Number(parts.day)}`,
    dateTime: `${date} ${time}`,
    time,
    timestamp: utcDate.getTime(),
  };
};
