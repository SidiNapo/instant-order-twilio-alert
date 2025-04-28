
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Configure CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { orderDetails } = await req.json();
    console.log('Received order notification request:', JSON.stringify(orderDetails));
    
    // Validate request data
    if (!orderDetails || !orderDetails.customerName || !orderDetails.phoneNumber) {
      throw new Error('Invalid order data provided');
    }

    // Format message
    const adminPhone = Deno.env.get('ADMIN_PHONE_NUMBER') || '+212630475003'; // Fallback to default
    const message = `📦 New Order Received!

👤 Customer: ${orderDetails.customerName}
📞 Phone: ${orderDetails.phoneNumber}
📍 Address: ${orderDetails.address}
🛒 Items: ${orderDetails.items}
🔢 Quantity: ${orderDetails.quantity}

Order received on: ${new Date().toLocaleString()}`;

    console.log('Sending WhatsApp notification to admin phone:', adminPhone);
    
    // Twilio credentials from environment variables
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    
    if (!accountSid || !authToken) {
      throw new Error('Missing Twilio credentials');
    }

    // Call Twilio API directly using fetch instead of the SDK
    const twilioEndpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const auth = btoa(`${accountSid}:${authToken}`);

    const formData = new URLSearchParams();
    formData.append('To', `whatsapp:${adminPhone}`);
    formData.append('From', 'whatsapp:+14155238886'); // Default Twilio WhatsApp sandbox number
    formData.append('Body', message);

    const twilioResponse = await fetch(twilioEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    const twilioResult = await twilioResponse.json();
    
    if (!twilioResponse.ok) {
      console.error('Twilio API error:', twilioResult);
      throw new Error(`Twilio API error: ${twilioResult.message || 'Unknown error'}`);
    }

    console.log('WhatsApp message sent successfully, SID:', twilioResult.sid);

    // Return success response
    return new Response(
      JSON.stringify({ success: true, messageId: twilioResult.sid }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in send-whatsapp-notification function:', error);
    
    // Return error response
    return new Response(
      JSON.stringify({ 
        error: true, 
        message: error.message || 'Failed to send notification' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
})
