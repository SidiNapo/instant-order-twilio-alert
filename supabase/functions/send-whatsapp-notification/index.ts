
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Configure CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Create Twilio client using Deno-compatible imports
const createTwilioClient = async () => {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  
  if (!accountSid || !authToken) {
    throw new Error('Missing Twilio credentials');
  }

  // Import Twilio from npm using Deno's compatibility layer
  const { Twilio } = await import("npm:twilio@4.21.0");
  return new Twilio(accountSid, authToken);
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
    
    try {
      // Initialize Twilio client
      const client = await createTwilioClient();
      
      // Send WhatsApp message using Twilio
      const response = await client.messages.create({
        body: message,
        from: 'whatsapp:+14155238886', // Default Twilio WhatsApp sandbox number
        to: `whatsapp:${adminPhone}`
      });

      console.log('WhatsApp message sent successfully, SID:', response.sid);

      // Return success response
      return new Response(
        JSON.stringify({ success: true, messageId: response.sid }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } catch (twilioError) {
      console.error('Twilio error:', twilioError);
      throw new Error(`Failed to send WhatsApp notification: ${twilioError.message}`);
    }
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
