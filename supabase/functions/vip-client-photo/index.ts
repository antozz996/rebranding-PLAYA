import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

function jsonResponse(payload: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(payload), {
        status,
        headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
        }
    });
}

function normalizePhotoPath(value: string) {
    return value
        .trim()
        .replace(/^\/+/, "")
        .replace(/^client-photos\//, "");
}

Deno.serve(async (request) => {
    if (request.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    if (request.method !== "POST") {
        return jsonResponse({ error: "Method not allowed." }, 405);
    }

    try {
        const { token } = await request.json();
        const sessionToken = String(token || "").trim();

        if (!sessionToken) {
            return jsonResponse({ error: "Missing client token." }, 400);
        }

        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const secretKeysRaw =
            Deno.env.get("SUPABASE_SECRET_KEYS") ||
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        if (!supabaseUrl || !secretKeysRaw) {
            return jsonResponse({ error: "Supabase secrets not configured." }, 500);
        }

        const parsedSecretKeys = secretKeysRaw.startsWith("{")
            ? JSON.parse(secretKeysRaw)
            : { default: secretKeysRaw };

        const serviceRoleKey = parsedSecretKeys.default;
        if (!serviceRoleKey) {
            return jsonResponse({ error: "Missing default service role key." }, 500);
        }

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

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

        const { data: client, error: clientError } = await supabaseAdmin
            .from("clients")
            .select("full_name, status, photo_path")
            .eq("id", session.client_id)
            .maybeSingle();

        if (clientError) {
            throw clientError;
        }

        if (!client) {
            return jsonResponse({ error: "Client not found." }, 404);
        }

        if (!["APPROVATO", "VIP", "IN_OSSERVAZIONE"].includes(client.status)) {
            return jsonResponse({ error: "Client profile is not allowed." }, 403);
        }

        const rawPhotoPath = String(client.photo_path || "").trim();
        if (!rawPhotoPath) {
            return jsonResponse({
                photoUrl: null,
                hasPhoto: false
            });
        }

        if (/^https?:\/\//i.test(rawPhotoPath)) {
            return jsonResponse({
                photoUrl: rawPhotoPath,
                hasPhoto: true
            });
        }

        const normalizedPath = normalizePhotoPath(rawPhotoPath);
        if (!normalizedPath) {
            return jsonResponse({
                photoUrl: null,
                hasPhoto: false
            });
        }

        const { data: signed, error: signedError } = await supabaseAdmin.storage
            .from("client-photos")
            .createSignedUrl(normalizedPath, 60 * 20);

        if (signedError) {
            throw signedError;
        }

        return jsonResponse({
            photoUrl: signed?.signedUrl || null,
            hasPhoto: Boolean(signed?.signedUrl)
        });
    } catch (error) {
        console.error("vip-client-photo error", error);
        return jsonResponse({ error: "Unable to resolve client photo." }, 500);
    }
});
