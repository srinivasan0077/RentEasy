// ============================================
// Supabase Edge Function: Admin Operations
// Deploy: supabase functions deploy admin-update-user
// ============================================
// Required secrets:
//   SUPABASE_URL (auto-set)
//   SUPABASE_SERVICE_ROLE_KEY (auto-set)
//   ADMIN_EMAIL — the superuser email allowed to call this
// ============================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminEmail = Deno.env.get('ADMIN_EMAIL');

    // Parse body FIRST (stream can only be read once)
    const body = await req.json();
    const { action, ...params } = body;

    // Verify the caller is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service_role client to verify the user's JWT token
    const token = authHeader.replace('Bearer ', '');
    const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      console.error('Auth verification failed:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized', detail: authError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if the caller is the admin
    if (user.email !== adminEmail) {
      return new Response(
        JSON.stringify({ error: 'Forbidden — admin access only' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Admin is verified — use service_role for all operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    switch (action) {
      // ============ LIST ALL USERS ============
      case 'list_users': {
        const { data, error } = await supabaseAdmin
          .from('profiles')
          .select('id, full_name, email, phone, plan, subscription_ends_at, trial_started_at, created_at')
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Get storage usage for each user
        const usersWithStorage = await Promise.all(
          (data || []).map(async (u) => {
            const { data: storage } = await supabaseAdmin.rpc('get_storage_usage', { user_uuid: u.id });
            return { ...u, storage: storage || { used_mb: 0, limit_mb: 0, file_count: 0 } };
          })
        );

        return new Response(
          JSON.stringify({ users: usersWithStorage }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ============ UPDATE USER PLAN ============
      case 'update_plan': {
        const { userId, plan, extensionDays } = params;
        if (!userId || !plan) throw new Error('userId and plan are required');

        const validPlans = ['free', 'trial', 'pro', 'business'];
        if (!validPlans.includes(plan)) throw new Error(`Invalid plan: ${plan}`);

        const updates: Record<string, any> = { plan };

        if (extensionDays && extensionDays > 0) {
          // Extend subscription from now
          updates.subscription_ends_at = new Date(
            Date.now() + extensionDays * 24 * 60 * 60 * 1000
          ).toISOString();
        }

        const { error } = await supabaseAdmin
          .from('profiles')
          .update(updates)
          .eq('id', userId);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, message: `User plan updated to ${plan}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ============ ADD BONUS STORAGE ============
      case 'add_storage_bonus': {
        const { userId, bonusMB } = params;
        if (!userId || !bonusMB) throw new Error('userId and bonusMB are required');

        // Store bonus in a profile column (we'll add this column)
        const { error } = await supabaseAdmin
          .from('profiles')
          .update({ storage_bonus_mb: bonusMB })
          .eq('id', userId);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, message: `Added ${bonusMB}MB bonus storage` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ============ GET USER DETAILS ============
      case 'get_user_details': {
        const { userId } = params;
        if (!userId) throw new Error('userId is required');

        const [profileRes, storageRes, propsRes, tenantsRes, subsRes] = await Promise.all([
          supabaseAdmin.from('profiles').select('*').eq('id', userId).single(),
          supabaseAdmin.rpc('get_storage_usage', { user_uuid: userId }),
          supabaseAdmin.from('properties').select('id').eq('user_id', userId),
          supabaseAdmin.from('tenants').select('id').eq('user_id', userId),
          supabaseAdmin.from('subscription_history').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
        ]);

        return new Response(
          JSON.stringify({
            profile: profileRes.data,
            storage: storageRes.data,
            propertyCount: propsRes.data?.length || 0,
            tenantCount: tenantsRes.data?.length || 0,
            recentSubscriptions: subsRes.data || [],
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ============ EXTEND TRIAL ============
      case 'extend_trial': {
        const { userId, days } = params;
        if (!userId || !days) throw new Error('userId and days are required');

        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('subscription_ends_at')
          .eq('id', userId)
          .single();

        const currentEnd = profile?.subscription_ends_at
          ? new Date(profile.subscription_ends_at)
          : new Date();

        const newEnd = new Date(Math.max(currentEnd.getTime(), Date.now()) + days * 24 * 60 * 60 * 1000);

        const { error } = await supabaseAdmin
          .from('profiles')
          .update({
            plan: 'trial',
            subscription_ends_at: newEnd.toISOString(),
          })
          .eq('id', userId);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, message: `Trial extended by ${days} days until ${newEnd.toLocaleDateString('en-IN')}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (err) {
    console.error('Admin function error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
