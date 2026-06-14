import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Webhook } from "https://esm.sh/svix@1.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const clerkWebhookSecret = Deno.env.get("CLERK_WEBHOOK_SECRET");
const supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("VITE_SUPABASE_URL");
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!clerkWebhookSecret || !supabaseUrl || !supabaseServiceRoleKey) {
    console.error("Missing environment variables.");
    return new Response("Internal Server Error", { status: 500 });
  }

  const payload = await req.text();
  const headers = req.headers;

  const svixId = headers.get("svix-id");
  const svixTimestamp = headers.get("svix-timestamp");
  const svixSignature = headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const wh = new Webhook(clerkWebhookSecret);
  let evt: any;

  try {
    evt = wh.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
  } catch (err) {
    console.error("Webhook signature verification failed.", err);
    return new Response("Invalid signature", { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  if (evt.type === "user.created") {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;
    const email = email_addresses?.[0]?.email_address;
    const fullName = [first_name, last_name].filter(Boolean).join(" ") || email?.split('@')[0];

    if (!email) {
      return new Response("No email found", { status: 400 });
    }

    try {
      // 1. Create User in Supabase Auth (This automatically generates a UUID)
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          avatar_url: image_url,
          clerk_id: id // Optional metadata
        }
      });

      if (authError) {
        console.error("Supabase createUser error:", authError);
        return new Response("Failed to create auth user", { status: 500 });
      }

      const supabaseUid = authData.user.id;

      // 2. The `on_auth_user_created` trigger in Postgres automatically creates the `profiles` row.
      // We just need to update it with the Clerk ID!
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ clerk_id: id })
        .eq('id', supabaseUid);

      if (profileError) {
        console.error("Supabase profile update error:", profileError);
        return new Response("Failed to update profile", { status: 500 });
      }

      // 3. Update Clerk User's publicMetadata with the Supabase UUID
      // We'll use the native fetch to Clerk Backend API to avoid extra dependencies
      const clerkSecretKey = Deno.env.get("CLERK_SECRET_KEY");
      if (clerkSecretKey) {
        const updateRes = await fetch(`https://api.clerk.com/v1/users/${id}/metadata`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${clerkSecretKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            public_metadata: {
              supabase_uuid: supabaseUid
            }
          })
        });

        if (!updateRes.ok) {
          console.error("Failed to update Clerk metadata", await updateRes.text());
        }
      } else {
        console.warn("CLERK_SECRET_KEY not set. Cannot update user metadata in Clerk.");
      }

      return new Response(JSON.stringify({ success: true, supabase_uid: supabaseUid }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Unexpected error:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  // Handle user.updated or user.deleted if needed
  if (evt.type === "user.deleted") {
      const { id } = evt.data;
      // Find supabase user by clerk_id and delete
      const { data: profile } = await supabase.from('profiles').select('id').eq('clerk_id', id).single();
      if (profile?.id) {
          await supabase.auth.admin.deleteUser(profile.id);
      }
      return new Response("User deleted", { status: 200 });
  }

  return new Response("Webhook received", { status: 200 });
});
