import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

type JsonPayload = Record<string, unknown>;

function jsonResponse(payload: JsonPayload, status = 200) {
    return new Response(JSON.stringify(payload), {
        status,
        headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
        }
    });
}

function isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function getServiceRoleKey() {
    const rawValue =
        Deno.env.get("SUPABASE_SECRET_KEYS") ||
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!rawValue) {
        return "";
    }

    if (!rawValue.trim().startsWith("{")) {
        return rawValue;
    }

    const parsed = JSON.parse(rawValue);
    return String(parsed.default || "");
}

function getPublicSiteUrl() {
    return String(Deno.env.get("PUBLIC_SITE_URL") || "https://rebranding-playa.vercel.app")
        .replace(/\/+$/, "");
}

function buildStaffBookingUrl(bookingId: string, bookingDate: string) {
    const url = new URL(getPublicSiteUrl() + "/vip-verify.html");
    url.searchParams.set("tab", "bookings");
    url.searchParams.set("booking", bookingId);

    if (bookingDate) {
        url.searchParams.set("date", bookingDate);
    }

    return url.toString();
}

function buildQrImageUrl(payload: string) {
    const url = new URL("https://api.qrserver.com/v1/create-qr-code/");
    url.searchParams.set("size", "260x260");
    url.searchParams.set("margin", "16");
    url.searchParams.set("data", payload);
    return url.toString();
}

function maskEmail(email: string) {
    const [localPart, domain] = email.split("@");
    if (!localPart || !domain) {
        return "email cliente";
    }

    return localPart.slice(0, 2) + "***@" + domain;
}

function formatDateIt(value: string) {
    const date = new Date(value + "T00:00:00");
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat("it-IT", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric"
    }).format(date);
}

function escapeHtml(value: string) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

Deno.serve(async (request) => {
    if (request.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    if (request.method !== "POST") {
        return jsonResponse({ error: "Method not allowed." }, 405);
    }

    try {
        const { token, booking_id } = await request.json();
        const sessionToken = String(token || "").trim();
        const bookingId = String(booking_id || "").trim();

        if (!isUuid(bookingId)) {
            return jsonResponse({ error: "Invalid booking_id payload." }, 400);
        }

        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const serviceRoleKey = getServiceRoleKey();
        if (!supabaseUrl || !serviceRoleKey) {
            return jsonResponse({
                success: false,
                skipped: true,
                message: "Email non inviata: segreti Supabase non configurati sulla Edge Function."
            });
        }

        const resendApiKey = Deno.env.get("RESEND_API_KEY");
        const emailFrom = Deno.env.get("BOOKING_EMAIL_FROM");
        if (!resendApiKey || !emailFrom) {
            return jsonResponse({
                success: false,
                skipped: true,
                message: "QR creato. Email non inviata: configura RESEND_API_KEY e BOOKING_EMAIL_FROM."
            });
        }

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        // 1. Authenticate caller (Hybrid: Staff Auth Header or Client Body Token)
        let isStaff = false;
        let clientId: string | null = null;

        const authHeader = request.headers.get("Authorization") || "";
        const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();

        if (jwt && jwt !== Deno.env.get("SUPABASE_ANON_KEY")) {
            const authClient = createClient(supabaseUrl, jwt, {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            });

            const { data: { user } } = await authClient.auth.getUser();
            if (user) {
                const { data: staff } = await supabaseAdmin
                    .from("staff_users")
                    .select("role")
                    .eq("id", user.id)
                    .maybeSingle();
                if (staff) {
                    isStaff = true;
                }
            }
        }

        if (!isStaff) {
            if (!isUuid(sessionToken)) {
                return jsonResponse({ error: "Unauthorized: Missing client session token or staff session." }, 401);
            }

            const { data: session, error: sessionError } = await supabaseAdmin
                .from("client_sessions")
                .select("client_id, expires_at")
                .eq("token", sessionToken)
                .maybeSingle();

            if (sessionError) {
                throw sessionError;
            }

            if (!session || new Date(session.expires_at).getTime() <= Date.now()) {
                return jsonResponse({ error: "Client session is invalid or expired." }, 401);
            }

            clientId = session.client_id;
        }

        // 2. Fetch booking
        const { data: booking, error: bookingError } = await supabaseAdmin
            .from("bookings")
            .select("id, client_id, booking_date, time_slot, adults, children, spot_code_snapshot, area_preference, status")
            .eq("id", bookingId)
            .maybeSingle();

        if (bookingError) {
            throw bookingError;
        }

        if (!booking) {
            return jsonResponse({ error: "Booking not found." }, 404);
        }

        // For client, ensure ownership
        if (!isStaff && booking.client_id !== clientId) {
            return jsonResponse({ error: "Forbidden: Booking not owned by this client session." }, 403);
        }

        // 3. Fetch client details
        const { data: client, error: clientError } = await supabaseAdmin
            .from("clients")
            .select("full_name, email")
            .eq("id", booking.client_id)
            .maybeSingle();

        if (clientError) {
            throw clientError;
        }

        const clientEmail = String(client?.email || "").trim();
        if (!clientEmail) {
            return jsonResponse({
                success: false,
                skipped: true,
                message: "QR creato. Email non inviata perché il profilo cliente non ha un indirizzo email salvato."
            });
        }

        const staffUrl = buildStaffBookingUrl(booking.id, booking.booking_date);
        const qrImageUrl = buildQrImageUrl(staffUrl);
        const clientName = String(client?.full_name || "Cliente VIP");
        const spotLabel = String(booking.spot_code_snapshot || booking.area_preference || "postazione selezionata");
        const replyTo = Deno.env.get("BOOKING_EMAIL_REPLY_TO") || undefined;

        const subjectLine = booking.status === "CONFERMATA"
            ? "Conferma prenotazione Fior d'Acqua VIP"
            : "QR richiesta prenotazione Fior d'Acqua VIP";

        const resendPayload: Record<string, unknown> = {
            from: emailFrom,
            to: [clientEmail],
            subject: subjectLine,
            html: buildEmailHtml({
                clientName,
                bookingId: booking.id,
                bookingDate: booking.booking_date,
                spotLabel,
                adults: Number(booking.adults || 0),
                children: Number(booking.children || 0),
                status: booking.status,
                staffUrl,
                qrImageUrl
            })
        };

        if (replyTo) {
            resendPayload.reply_to = replyTo;
        }

        const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${resendApiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(resendPayload)
        });

        const responsePayload = await response.json().catch(() => ({}));
        if (!response.ok) {
            console.error("vip-booking-email resend error", response.status, responsePayload);
            return jsonResponse({ error: "Unable to send booking email." }, 502);
        }

        return jsonResponse({
            success: true,
            sent_to: maskEmail(clientEmail),
            booking_id: booking.id,
            status: booking.status,
            staff_url: staffUrl,
            qr_image_url: qrImageUrl
        });
    } catch (error) {
        console.error("vip-booking-email error", error);
        return jsonResponse({ error: "Unable to process booking email." }, 500);
    }
});

function buildEmailHtml(input: {
    clientName: string;
    bookingId: string;
    bookingDate: string;
    spotLabel: string;
    adults: number;
    children: number;
    status: string;
    staffUrl: string;
    qrImageUrl: string;
}) {
    const safeName = escapeHtml(input.clientName);
    const safeSpot = escapeHtml(input.spotLabel);
    const safeBookingId = escapeHtml(input.bookingId);
    const safeDate = escapeHtml(formatDateIt(input.bookingDate));
    const safeStaffUrl = escapeHtml(input.staffUrl);
    const safeQrImageUrl = escapeHtml(input.qrImageUrl);

    const isConfirmed = input.status === "CONFERMATA";
    
    // Dynamic text based on status
    const titleText = isConfirmed ? "Prenotazione Confermata" : "QR richiesta prenotazione";
    const statusLabel = isConfirmed ? "Confermata" : "In attesa";
    const bodyText = isConfirmed
        ? `Ciao ${safeName}, la tua prenotazione per Fior d'Acqua VIP Club è stata confermata! Mostra questo QR code allo staff al tuo arrivo per effettuare il check-in.`
        : `Ciao ${safeName}, abbiamo ricevuto la tua richiesta VIP. La prenotazione resta in attesa finché lo staff non la conferma.`;

    const statusBadgeStyle = isConfirmed
        ? "background: #d4edda; color: #155724; border: 1px solid #c3e6cb;"
        : "background: #fff3cd; color: #856404; border: 1px solid #ffeeba;";

    return `
        <div style="font-family:Montserrat,Arial,sans-serif;background:#eefaff;padding:28px;color:#003f88;">
            <div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:28px;padding:28px;border:1px solid #c7eef9;box-shadow:0 8px 30px rgba(0,0,0,0.03);">
                <p style="margin:0 0 8px;text-transform:uppercase;letter-spacing:.14em;font-size:12px;color:#0077b6;font-weight:800;">Fior d'Acqua VIP Club</p>
                <h1 style="font-family:Fredoka,Montserrat,Arial,sans-serif;margin:0 0 12px;font-size:32px;color:#003f88;">${titleText}</h1>
                <p style="font-size:16px;line-height:1.7;margin:0 0 20px;">${bodyText}</p>
                
                <div style="display:grid;gap:10px;margin:22px 0;padding:18px;border-radius:20px;background:#eefaff;">
                    <strong>Data: ${safeDate}</strong>
                    <span>Postazione: ${safeSpot}</span>
                    <span>Persone: ${input.adults} adulti, ${input.children} bambini</span>
                    <span>Codice richiesta: ${safeBookingId}</span>
                    <div style="margin-top: 8px;">
                        <span style="display:inline-block;padding:4px 12px;border-radius:12px;font-size:13px;font-weight:700;${statusBadgeStyle}">
                            Stato: ${statusLabel}
                        </span>
                    </div>
                </div>
                
                <div style="text-align:center;margin:26px 0;">
                    <img src="${safeQrImageUrl}" width="260" height="260" alt="QR prenotazione Fior d'Acqua VIP" style="border-radius:18px;border:1px solid #c7eef9;background:#fff;padding:10px;">
                </div>
                <p style="font-size:14px;line-height:1.7;color:#466b92;">Il QR è pensato per il controllo operativo dello staff. Se non visualizzi l'immagine, puoi mostrare questo link allo staff: <br><a href="${safeStaffUrl}" style="color:#0077b6;">${safeStaffUrl}</a></p>
            </div>
        </div>
    `;
}
