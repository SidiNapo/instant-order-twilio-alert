
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { OrderDetails } from "@/types/order";
import { Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const OrderForm = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderDetails, setOrderDetails] = useState<OrderDetails>({
    customerName: "",
    phoneNumber: "",
    address: "",
    items: "",
    quantity: 1,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Create the order data object with proper column names
      const orderData = {
        customer_name: orderDetails.customerName,
        phone_number: orderDetails.phoneNumber,
        address: orderDetails.address,
        items: orderDetails.items,
        quantity: orderDetails.quantity
      };

      // Store order in Supabase
      const { error: dbError } = await supabase
        .from('orders')
        .insert(orderData);

      if (dbError) {
        console.error('Database error:', dbError);
        throw new Error('Failed to save order to database');
      }

      // Send WhatsApp notification
      const { error: whatsappError } = await supabase.functions.invoke('send-whatsapp', {
        body: { orderDetails }
      });

      if (whatsappError) {
        console.error('WhatsApp notification error:', whatsappError);
        throw new Error('Failed to send notification');
      }

      toast({
        title: "Order Submitted Successfully!",
        description: "We'll contact you shortly to confirm your order.",
      });

      // Reset form
      setOrderDetails({
        customerName: "",
        phoneNumber: "",
        address: "",
        items: "",
        quantity: 1,
      });
    } catch (error) {
      console.error('Error submitting order:', error);
      toast({
        title: "Error Submitting Order",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setOrderDetails((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <Card className="w-full max-w-md p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Place Your Order</h2>
        <p className="text-gray-500">Fill in your details below</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Name</label>
          <Input
            type="text"
            name="customerName"
            value={orderDetails.customerName}
            onChange={handleChange}
            placeholder="Your full name"
            required
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Phone Number</label>
          <Input
            type="tel"
            name="phoneNumber"
            value={orderDetails.phoneNumber}
            onChange={handleChange}
            placeholder="Your phone number"
            required
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Delivery Address</label>
          <Textarea
            name="address"
            value={orderDetails.address}
            onChange={handleChange}
            placeholder="Your delivery address"
            required
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Items</label>
          <Textarea
            name="items"
            value={orderDetails.items}
            onChange={handleChange}
            placeholder="List the items you want to order"
            required
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Quantity</label>
          <Input
            type="number"
            name="quantity"
            value={orderDetails.quantity}
            onChange={handleChange}
            min="1"
            required
            className="w-full"
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            "Processing..."
          ) : (
            <>
              Submit Order <Send className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </form>
    </Card>
  );
};

export default OrderForm;
