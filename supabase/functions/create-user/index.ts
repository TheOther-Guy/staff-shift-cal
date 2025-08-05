import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { email, password, full_name, role, company_id, brand_id, brand_ids = [], store_id, request_approval = false } = await req.json()

    // If requesting approval, create approval request instead of user
    if (request_approval) {
      // Create approval request
      const { error: approvalError } = await supabaseAdmin
        .from('approval_requests')
        .insert({
          type: 'profile_creation',
          request_data: {
            email,
            password,
            full_name,
            role: role || 'store_manager'
          },
          status: 'pending'
        })

      if (approvalError) throw approvalError

      // Send notification email to admin
      const { data: adminData } = await supabaseAdmin
        .from('profiles')
        .select('email')
        .eq('role', 'admin')
        .limit(1)
        .single()

      if (adminData?.email) {
        await supabaseAdmin.functions.invoke('send-approval-email', {
          body: {
            type: 'profile_creation',
            to: adminData.email,
            from: email,
            data: {
              full_name,
              email,
              role: role || 'store_manager'
            }
          }
        })
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Approval request created' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    // Create the user in auth (only if not requesting approval)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name }
    })

    if (authError) throw authError

    // Create the profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        user_id: authData.user.id,
        email,
        full_name,
        role,
        company_id: company_id || null,
        brand_id: brand_id || null,
        store_id: store_id || null
      }, {
        onConflict: 'user_id'
      })

    if (profileError) throw profileError

    // Handle multiple brand assignments for brand managers
    if (role === 'brand_manager' && brand_ids.length > 0) {
      const userBrandInserts = brand_ids.map((brandId: string) => ({
        user_id: authData.user.id,
        brand_id: brandId
      }));

      const { error: userBrandsError } = await supabaseAdmin
        .from('user_brands')
        .insert(userBrandInserts);

      if (userBrandsError) throw userBrandsError;
    }

    return new Response(
      JSON.stringify({ success: true, user: authData.user }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})