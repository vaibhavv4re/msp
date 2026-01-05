
import { init } from "@instantdb/admin";
import { NextRequest, NextResponse } from "next/server";
import { AppSchema } from "@/instant.schema";

const db = init<AppSchema>({
    appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID!,
    adminToken: process.env.INSTANT_APP_ADMIN_TOKEN!,
});

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string; secret: string }> }
) {
    const { userId, secret } = await params;

    // 1. Verify user and fetch their events in one query
    const userData = await db.query({
        $users: {
            $: { where: { id: userId, calendarSecret: secret } },
            calendarEvents: {
                $: {
                    where: {
                        status: { $in: ["confirmed", "tentative"] }
                    }
                }
            }
        }
    });

    const user = userData.$users[0];
    if (!user) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const appName = process.env.NEXT_PUBLIC_APP_NAME || "MSP";
    const events = user.calendarEvents || [];

    // 2. Generate iCal string
    let ical = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        `PRODID:-//${appName} Business Suite//Calendar Sync//EN`,
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        `X-WR-CALNAME:${appName} | Work Schedule`,
        `X-WR-CALDESC:Business shoots and events from ${appName}`,
        "X-WR-TIMEZONE:UTC",
        "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
        "X-PUBLISHED-TTL:PT1H",
    ];

    events.forEach((event: any) => {
        const startStr = event.start.replace(/[-:]/g, "").split(".")[0] + "Z";
        const endStr = event.end.replace(/[-:]/g, "").split(".")[0] + "Z";
        const stampStr = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

        ical.push("BEGIN:VEVENT");
        ical.push(`UID:${event.icalUid || event.id}`);
        ical.push(`DTSTAMP:${stampStr}`);
        ical.push(`DTSTART:${startStr}`);
        ical.push(`DTEND:${endStr}`);
        ical.push(`SUMMARY:${event.title || appName + " Shoot"}`);
        ical.push(`STATUS:${event.status === "confirmed" ? "CONFIRMED" : "TENTATIVE"}`);
        if (event.notes) {
            ical.push(`DESCRIPTION:${event.notes.replace(/\n/g, "\\n")}`);
        }
        ical.push("END:VEVENT");
    });

    ical.push("END:VCALENDAR");

    // Joining with CRLF as per iCal spec
    const body = ical.join("\r\n");

    return new NextResponse(body, {
        headers: {
            "Content-Type": "text/calendar; charset=utf-8",
            "Cache-Control": "public, s-maxage=3600",
        },
    });
}
