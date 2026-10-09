import { dailyMotivationalMessages } from "@/lib/daily-motivational-messages";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function getDailyMotivation(now = new Date()): string {
  const parts = dateFormatter.formatToParts(now);
  const year = Number(parts.find((part) => part.type === "year")!.value);
  const month = Number(parts.find((part) => part.type === "month")!.value);
  const day = Number(parts.find((part) => part.type === "day")!.value);
  // Dias absolutos mantêm o ciclo contínuo na virada do ano e em anos bissextos.
  const dayNumber = Math.floor(Date.UTC(year, month - 1, day) / 86400000);
  const index = ((dayNumber % dailyMotivationalMessages.length) + dailyMotivationalMessages.length) % dailyMotivationalMessages.length;
  return dailyMotivationalMessages[index]!;
}
