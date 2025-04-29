
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { supabase } from "../_shared/supabase-client.ts";

// Configure CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { orderData } = await req.json();
    console.log('Received order submission:', JSON.stringify(orderData));
    
    // Validate request data
    if (!orderData || !orderData.customerName || !orderData.phoneNumber) {
      throw new Error('Invalid order data provided');
    }

    // Prepare the data for Supabase
    const dbOrderData = {
      customer_name: orderData.customerName,
      phone_number: orderData.phoneNumber,
      address: orderData.address,
      items: orderData.items,
      quantity: orderData.quantity
    };

    // Save order to database
    const { data: insertedOrder, error: dbError } = await supabase
      .from('orders')
      .insert(dbOrderData)
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error("Failed to save order to database");
    }

    // Call WhatsApp notification function
    const notificationResponse = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-whatsapp-notification`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        },
        body: JSON.stringify({ orderDetails: orderData }),
      }
    );

    const notificationResult = await notificationResponse.json();
    console.log('WhatsApp notification result:', notificationResult);

    // Return response with order data and notification status
    return new Response(
      JSON.stringify({
        success: true,
        order: insertedOrder,
        notification: notificationResponse.ok ? 'sent' : 'failed',
        notificationDetails: notificationResult
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in submit-order function:', error);
    
    // Return error response
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error.message || 'Failed to process order' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
