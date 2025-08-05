import { supabase } from "@/integrations/supabase/client";

export async function resetAdminPassword() {
  try {
    const { data, error } = await supabase.functions.invoke('reset-admin-password', {
      body: {}
    });
    
    if (error) {
      console.error('Error calling reset function:', error);
      return { success: false, error: error.message };
    }
    
    console.log('Password reset response:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}