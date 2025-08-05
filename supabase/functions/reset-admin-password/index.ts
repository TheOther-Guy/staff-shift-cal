import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Get the admin user by email
    const { data: adminProfile } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('email', 'kareem722@gmail.com')
      .eq('role', 'admin')
      .single()

    if (!adminProfile) {
      return new Response(
        JSON.stringify({ error: 'Admin user not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Reset the admin password
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      adminProfile.user_id,
      { password: '123456789' }
    )

    if (error) {
      console.error('Error resetting admin password:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to reset password' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        message: 'Admin password reset successfully',
        email: 'kareem722@gmail.com'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in reset-admin-password function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})