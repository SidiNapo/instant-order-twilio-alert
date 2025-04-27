
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Twilio } from 'npm:twilio'

const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
const adminPhone = '+212630475003'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { orderDetails } = await req.json()
    const client = new Twilio(accountSid, authToken)

    const message = `New Order Received!\n
Customer: ${orderDetails.customerName}
Phone: ${orderDetails.phoneNumber}
Address: ${orderDetails.address}
Items: ${orderDetails.items}
Quantity: ${orderDetails.quantity}`

    // Send WhatsApp message using Twilio
    const response = await client.messages.create({
      body: message,
      from: 'whatsapp:+14155238886', // Default Twilio WhatsApp testing number
      to: `whatsapp:${adminPhone}`
    })

    console.log('WhatsApp message sent:', response.sid)

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error sending WhatsApp message:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
