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

    // If approved, create the actual time-off entry
    if (action === 'approve') {
      const requestData = approvalRequest.request_data;
      const { error: timeOffError } = await supabase
        .from('time_off_entries')
        .insert({
          employee_id: requestData.employeeId,
          start_date: requestData.startDate,
          end_date: requestData.endDate,
          type: requestData.type,
          notes: requestData.notes,
          status: 'approved'
        });

      if (timeOffError) {
        console.error('Error creating time-off entry:', timeOffError);
      }
    }

    console.log(`Approval request ${approvalId} ${action}d successfully`);

    // Just close the window/tab immediately without showing anything
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Processing...</title>
          <script>
            window.close();
            // If window.close() doesn't work, redirect to blank page
            setTimeout(function() {
              window.location.href = 'about:blank';
            }, 100);
          </script>
        </head>
        <body></body>
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