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
        const { client_id } = await request.json();
        const clientId = String(client_id || "").trim();

        if (!clientId) {
            return jsonResponse({ error: "Invalid payload: missing client_id." }, 400);
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
        const emailFrom = Deno.env.get("BOOKING_EMAIL_FROM"); // standard sender key name
        if (!resendApiKey || !emailFrom) {
            return jsonResponse({
                success: false,
                skipped: true,
                message: "Profilo salvato. Email non inviata: configura RESEND_API_KEY e BOOKING_EMAIL_FROM."
            });
        }

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        // 1. Authenticate caller (Must be staff)
        const authHeader = request.headers.get("Authorization") || "";
        const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();

        if (!jwt || jwt === Deno.env.get("SUPABASE_ANON_KEY")) {
            return jsonResponse({ error: "Unauthorized: Missing staff credentials." }, 401);
        }

        const authClient = createClient(supabaseUrl, jwt, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        const { data: { user }, error: authError } = await authClient.auth.getUser();
        if (authError || !user) {
            return jsonResponse({ error: "Unauthorized: Invalid staff credentials." }, 401);
        }

        const { data: staff, error: staffError } = await supabaseAdmin
            .from("staff_users")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();

        if (staffError || !staff) {
            return jsonResponse({ error: "Forbidden: Access restricted to staff." }, 403);
        }

        // 2. Fetch Client Info
        const { data: client, error: clientError } = await supabaseAdmin
            .from("clients")
            .select("full_name, email, vip_level, card_code, status")
            .eq("id", clientId)
            .maybeSingle();

        if (clientError) {
            throw clientError;
        }

        if (!client) {
            return jsonResponse({ error: "Client not found." }, 404);
        }

        const clientEmail = String(client.email || "").trim();
        if (!clientEmail) {
            return jsonResponse({
                success: false,
                skipped: true,
                message: "Email non inviata perché il profilo cliente non ha un indirizzo email salvato."
            });
        }

        const publicSiteUrl = getPublicSiteUrl();
        const loginUrl = `${publicSiteUrl}/vip-login.html`;
        const replyTo = Deno.env.get("BOOKING_EMAIL_REPLY_TO") || undefined;

        const resendPayload: Record<string, unknown> = {
            from: emailFrom,
            to: [clientEmail],
            subject: "Benvenuto nel Fior d'Acqua VIP Club",
            html: buildProfileEmailHtml({
                clientName: client.full_name || "Cliente VIP",
                vipLevel: client.vip_level || "SILVER",
                cardCode: client.card_code,
                loginUrl
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
            console.error("vip-profile-email resend error", response.status, responsePayload);
            return jsonResponse({ error: "Unable to send profile email via Resend." }, 502);
        }

        return jsonResponse({
            success: true,
            sent_to: clientEmail.slice(0, 2) + "***@" + clientEmail.split("@")[1],
            card_code: client.card_code
        });
    } catch (error) {
        console.error("vip-profile-email error", error);
        return jsonResponse({ error: "Unable to process profile email." }, 500);
    }
});

function buildProfileEmailHtml(input: {
    clientName: string;
    vipLevel: string;
    cardCode: string;
    loginUrl: string;
}) {
    const safeName = escapeHtml(input.clientName);
    const safeCard = escapeHtml(input.cardCode);
    const safeLevel = escapeHtml(input.vipLevel);
    const safeLoginUrl = escapeHtml(input.loginUrl);

    let themeColor = "#0077b6";
    let themeBg = "#eefaff";
    let badgeStyle = "background: #e2f6ff; color: #0077b6; border: 1px solid #bdeaff;";

    if (input.vipLevel === "GOLD") {
        themeColor = "#b89009";
        themeBg = "#fffcf2";
        badgeStyle = "background: #fefae0; color: #b89009; border: 1px solid #f9ebae;";
    } else if (input.vipLevel === "BLACK") {
        themeColor = "#111111";
        themeBg = "#f8f9fa";
        badgeStyle = "background: #111111; color: #ffffff; border: 1px solid #333333;";
    } else { // SILVER
        themeColor = "#5c6b73";
        themeBg = "#f4f6f7";
        badgeStyle = "background: #e9ecef; color: #495057; border: 1px solid #dee2e6;";
    }

    return `
        <div style="font-family:Montserrat,Arial,sans-serif;background:${themeBg};padding:32px 16px;color:#212529;line-height:1.6;">
            <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:28px;padding:36px;border:1px solid rgba(0,0,0,0.06);box-shadow:0 8px 30px rgba(0,0,0,0.03);">
                <div style="text-align:center;margin-bottom:28px;">
                    <p style="margin:0;text-transform:uppercase;letter-spacing:.2em;font-size:12px;color:${themeColor};font-weight:800;">Fior d'Acqua VIP Club</p>
                    <div style="width:60px;height:1px;background:${themeColor};margin:12px auto 0;"></div>
                </div>

                <h1 style="font-family:Fredoka,Montserrat,Arial,sans-serif;margin:0 0 16px;font-size:28px;color:${themeColor};text-align:center;">Benvenuto nel Club</h1>
                
                <p style="font-size:16px;margin:0 0 24px;text-align:center;color:#495057;">
                    Gentile <strong>${safeName}</strong>, siamo lieti di confermare l'attivazione del tuo profilo esclusivo Fior d'Acqua VIP Club.
                </p>

                <div style="margin:28px 0;padding:24px;border-radius:20px;background:#ffffff;border:1px dashed #ced4da;text-align:center;">
                    <span style="font-size:12px;text-transform:uppercase;letter-spacing:.1em;color:#6c757d;display:block;margin-bottom:6px;">Livello Membro</span>
                    <strong style="font-size:18px;letter-spacing:.05em;display:inline-block;padding:6px 16px;border-radius:30px;${badgeStyle}">${safeLevel}</strong>
                    
                    <div style="margin:16px 0 0;">
                        <span style="font-size:12px;text-transform:uppercase;letter-spacing:.1em;color:#6c757d;display:block;margin-bottom:4px;">Codice Card Digitale</span>
                        <strong style="font-size:20px;font-family:monospace;color:#212529;letter-spacing:.05em;">${safeCard}</strong>
                    </div>
                </div>

                <div style="text-align:center;margin:32px 0 24px;">
                    <a href="${safeLoginUrl}" style="background:${themeColor};color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:50px;display:inline-block;box-shadow:0 4px 12px rgba(0,0,0,0.1);">Accedi alla tua Card</a>
                </div>

                <div style="border-top:1px solid #eee;padding-top:20px;margin-top:28px;text-align:center;font-size:13px;color:#6c757d;">
                    <p style="margin:0 0 4px;">Usa il tuo codice card e il tuo telefono registrato per accedere alla tua card digitale e richiedere prenotazioni.</p>
                    <p style="margin:0;">Questa email è strettamente personale e riservata.</p>
                </div>
            </div>
        </div>
    `;
}
