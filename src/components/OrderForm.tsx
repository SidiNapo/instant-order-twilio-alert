
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Phone, User, MapPin, Package, Loader2, Send } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

// Define order schema for validation
const orderSchema = z.object({
  customerName: z.string().min(2, "Name must be at least 2 characters"),
  phoneNumber: z.string().min(6, "Please enter a valid phone number"),
  address: z.string().min(5, "Please enter a complete address"),
  items: z.string().min(3, "Please specify what you're ordering"),
  quantity: z.number().int().positive().default(1),
});

type OrderFormData = z.infer<typeof orderSchema>;

const OrderForm = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  const [orderData, setOrderData] = useState<OrderFormData>({
    customerName: "",
    phoneNumber: "",
    address: "",
    items: "",
    quantity: 1,
  });

  const validateForm = (): boolean => {
    try {
      orderSchema.parse(orderData);
      setFormErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0].toString()] = err.message;
          }
        });
        setFormErrors(errors);
      }
      return false;
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setOrderData((prev) => ({
      ...prev,
      [name]: name === "quantity" ? parseInt(value) || 1 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Invalid form data",
        description: "Please correct the errors and try again.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);

    try {
      // Prepare the data for Supabase
      const dbOrderData = {
        customer_name: orderData.customerName,
        phone_number: orderData.phoneNumber,
        address: orderData.address,
        items: orderData.items,
        quantity: orderData.quantity
      };

      // Save order to database
      const { error: dbError } = await supabase
        .from('orders')
        .insert(dbOrderData);

      if (dbError) {
        console.error("Database error:", dbError);
        throw new Error("Failed to save order to database");
      }

      // Send WhatsApp notification
      const { error: notificationError } = await supabase.functions.invoke('send-whatsapp-notification', {
        body: { orderDetails: orderData }
      });

      if (notificationError) {
        console.error("Notification error:", notificationError);
        // We don't throw here because we want to show success even if notification fails
        // The order is saved in the database, and admin can still see it there
        toast({
          title: "Order Saved",
          description: "Your order was saved, but there was an issue sending the notification to admin.",
        });
      } else {
        // Show success message
        toast({
          title: "Order Submitted Successfully!",
          description: "Thank you for your order. We'll contact you shortly to confirm.",
        });
      }

      // Reset form
      setOrderData({
        customerName: "",
        phoneNumber: "",
        address: "",
        items: "",
        quantity: 1,
      });
    } catch (error) {
      console.error("Error submitting order:", error);
      toast({
        title: "Error Submitting Order",
        description: "There was an issue processing your order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Place Your Order</CardTitle>
        <CardDescription>Fill in your details to place an order</CardDescription>
      </CardHeader>
      
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="customerName" className={formErrors.customerName ? "text-destructive" : ""}>
              Full Name
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="customerName"
                name="customerName"
                value={orderData.customerName}
                onChange={handleChange}
                placeholder="John Doe"
                className={`pl-10 ${formErrors.customerName ? "border-destructive" : ""}`}
              />
            </div>
            {formErrors.customerName && (
              <p className="text-xs text-destructive">{formErrors.customerName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber" className={formErrors.phoneNumber ? "text-destructive" : ""}>
              Phone Number
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="phoneNumber"
                name="phoneNumber"
                value={orderData.phoneNumber}
                onChange={handleChange}
                placeholder="Your contact number"
                className={`pl-10 ${formErrors.phoneNumber ? "border-destructive" : ""}`}
              />
            </div>
            {formErrors.phoneNumber && (
              <p className="text-xs text-destructive">{formErrors.phoneNumber}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address" className={formErrors.address ? "text-destructive" : ""}>
              Delivery Address
            </Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Textarea
                id="address"
                name="address"
                value={orderData.address}
                onChange={handleChange}
                placeholder="Enter your complete delivery address"
                className={`pl-10 ${formErrors.address ? "border-destructive" : ""}`}
                rows={3}
              />
            </div>
            {formErrors.address && (
              <p className="text-xs text-destructive">{formErrors.address}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="items" className={formErrors.items ? "text-destructive" : ""}>
              Order Items
            </Label>
            <div className="relative">
              <Package className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Textarea
                id="items"
                name="items"
                value={orderData.items}
                onChange={handleChange}
                placeholder="List the items you want to order"
                className={`pl-10 ${formErrors.items ? "border-destructive" : ""}`}
                rows={3}
              />
            </div>
            {formErrors.items && (
              <p className="text-xs text-destructive">{formErrors.items}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">
              Quantity
            </Label>
            <Input
              id="quantity"
              name="quantity"
              type="number"
              value={orderData.quantity}
              onChange={handleChange}
              min="1"
              className={formErrors.quantity ? "border-destructive" : ""}
            />
          </div>
        </CardContent>

        <CardFooter>
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Submit Order
                <Send className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default OrderForm;
