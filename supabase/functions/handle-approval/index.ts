import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract approval details from URL parameters
    const url = new URL(req.url);
    const approvalId = url.searchParams.get('id');
    const action = url.searchParams.get('action'); // 'approve' or 'reject'
    const token = url.searchParams.get('token');

    if (!approvalId || !action || !token) {
      return new Response("Missing required parameters", { status: 400 });
    }

    // Initialize Supabase client with service role key for admin operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify the approval request exists and token is valid
    const { data: approvalRequest, error: fetchError } = await supabase
      .from('approval_requests')
      .select('*')
      .eq('id', approvalId)
      .eq('status', 'pending')
      .single();

    if (fetchError || !approvalRequest) {
      return new Response("Invalid or expired approval request", { status: 404 });
    }

    // Simple token validation (in production, use proper JWT or secure tokens)
    const expectedToken = btoa(`${approvalId}-${approvalRequest.created_at}`).slice(0, 20);
    if (token !== expectedToken) {
      return new Response("Invalid token", { status: 401 });
    }

    // Update approval request status
    const updateData: any = {
      status: action === 'approve' ? 'approved' : 'rejected',
      updated_at: new Date().toISOString()
    };

    if (action === 'approve') {
      updateData.approved_at = new Date().toISOString();
    } else {
      updateData.rejected_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from('approval_requests')
      .update(updateData)
      .eq('id', approvalId);

    if (updateError) {
      console.error('Error updating approval request:', updateError);
      return new Response("Failed to update approval request", { status: 500 });
    }

    console.log(`Approval request ${approvalId} ${action}d successfully`);

    // Return success page
    const actionText = action === 'approve' ? 'approved' : 'rejected';
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Request ${actionText}</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
            .success { color: #28a745; }
            .error { color: #dc3545; }
            .card { background: #f8f9fa; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          </style>
        </head>
        <body>
          <div class="card">
            <h1 class="${action === 'approve' ? 'success' : 'error'}">
              Request ${actionText.charAt(0).toUpperCase() + actionText.slice(1)}
            </h1>
            <p>The ${approvalRequest.type.replace('_', ' ')} request has been successfully ${actionText}.</p>
            <p><strong>Request ID:</strong> ${approvalId}</p>
            <p><strong>Action taken:</strong> ${new Date().toLocaleString()}</p>
          </div>
        </body>
      </html>
    `;

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in handle-approval function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);