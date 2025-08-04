import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApprovalEmailRequest {
  type: 'profile_creation' | 'time_off' | 'sick_leave' | 'annual_leave';
  requesterName: string;
  requesterEmail: string;
  approverEmail: string;
  approverName: string;
  details: any;
  approvalId: string;
}

const getEmailTemplate = (type: string, data: any) => {
  switch (type) {
    case 'profile_creation':
      return {
        subject: `New Profile Creation Request - ${data.requesterName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">New Profile Creation Request</h2>
            <p>Hello ${data.approverName},</p>
            <p>A new profile creation request requires your approval:</p>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Request Details:</h3>
              <p><strong>Requester:</strong> ${data.requesterName}</p>
              <p><strong>Email:</strong> ${data.requesterEmail}</p>
              <p><strong>Role:</strong> ${data.details.role || 'Not specified'}</p>
              <p><strong>Company:</strong> ${data.details.company || 'Not specified'}</p>
              <p><strong>Store:</strong> ${data.details.store || 'Not specified'}</p>
            </div>
            <p>Please review this request in the admin panel to approve or reject it.</p>
            <p style="color: #666; font-size: 14px;">This is an automated message from your HR Management System.</p>
          </div>
        `
      };
    
    case 'time_off':
    case 'sick_leave':
    case 'annual_leave':
      const token = btoa(`${data.approvalId}-${new Date().toISOString()}`).slice(0, 20);
      const approveUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/handle-approval?id=${data.approvalId}&action=approve&token=${token}`;
      const rejectUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/handle-approval?id=${data.approvalId}&action=reject&token=${token}`;
      
      return {
        subject: `${type.replace('_', ' ').toUpperCase()} Request - ${data.details.employeeName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">${type.replace('_', ' ').toUpperCase()} Request</h2>
            <p>Hello ${data.approverName},</p>
            <p>A new ${type.replace('_', ' ')} request requires your approval:</p>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Request Details:</h3>
              <p><strong>Employee:</strong> ${data.details.employeeName}</p>
              <p><strong>Requested by:</strong> ${data.requesterName}</p>
              <p><strong>Store:</strong> ${data.details.storeName}</p>
              <p><strong>Type:</strong> ${data.details.type}</p>
              <p><strong>Start Date:</strong> ${data.details.startDate}</p>
              <p><strong>End Date:</strong> ${data.details.endDate}</p>
              ${data.details.notes ? `<p><strong>Notes:</strong> ${data.details.notes}</p>` : ''}
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${approveUrl}" 
                 style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 0 10px; display: inline-block;">
                ✓ APPROVE
              </a>
              <a href="${rejectUrl}" 
                 style="background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 0 10px; display: inline-block;">
                ✗ REJECT
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">Click one of the buttons above to approve or reject this request.</p>
            <p style="color: #666; font-size: 12px;">This is an automated message from your HR Management System.</p>
          </div>
        `
      };
    
    default:
      return {
        subject: `Approval Request - ${data.requesterName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Approval Request</h2>
            <p>Hello ${data.approverName},</p>
            <p>A new request requires your approval from ${data.requesterName}.</p>
            <p>Please check the management panel for more details.</p>
          </div>
        `
      };
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      type,
      requesterName,
      requesterEmail,
      approverEmail,
      approverName,
      details,
      approvalId
    }: ApprovalEmailRequest = await req.json();

    console.log(`Sending ${type} approval email to ${approverEmail}`);

    const template = getEmailTemplate(type, {
      requesterName,
      requesterEmail,
      approverName,
      details,
      approvalId
    });

    const emailResponse = await resend.emails.send({
      from: "HR System <onboarding@resend.dev>",
      to: [approverEmail],
      subject: template.subject,
      html: template.html,
    });

    console.log("Approval email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      emailId: emailResponse.data?.id 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending approval email:", error);
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