
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

    // 1. Verify user and secret
    const userData = await db.query({
        $users: {
            $: { where: { id: userId, calendarSecret: secret } }
        }
    });

    const user = userData.$users[0];
    if (!user) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    // 2. Fetch events
    const eventData = await db.query({
        calendarEvents: {
            $: {
                where: {
                    "owner.id": userId,
                    status: { $in: ["confirmed", "tentative"] }
                }
            }
        }
    });

    const appName = process.env.NEXT_PUBLIC_APP_NAME || "MSP";

    // 3. Generate iCal string
    let ical = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        `PRODID:-//${appName} Business Suite//Calendar Sync//EN`,
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        `X-WR-CALNAME:${appName} events (${user.email || "User"})`,
        "X-WR-TIMEZONE:UTC",
    ];

    eventData.calendarEvents.forEach((event: any) => {
        const startStr = event.start.replace(/[-:]/g, "").split(".")[0] + "Z";
        const endStr = event.end.replace(/[-:]/g, "").split(".")[0] + "Z";

        ical.push("BEGIN:VEVENT");
        ical.push(`UID:${event.icalUid}`);
        ical.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`);
        ical.push(`DTSTART:${startStr}`);
        ical.push(`DTEND:${endStr}`);
        ical.push(`SUMMARY:${event.title || appName + " Shoot"}`);
        ical.push(`STATUS:${event.status === "confirmed" ? "CONFIRMED" : "TENTATIVE"}`);
        ical.push("END:VEVENT");
    });

    ical.push("END:VCALENDAR");

    return new NextResponse(ical.join("\r\n"), {
        headers: {
            "Content-Type": "text/calendar; charset=utf-8",
            "Content-Disposition": `attachment; filename="${appName.toLowerCase()}-events-${userId}.ics"`,
        },
    });
}
