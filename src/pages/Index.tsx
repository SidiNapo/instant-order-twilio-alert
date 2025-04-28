
import OrderForm from "@/components/OrderForm";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-md">
        <OrderForm />
      </div>
    </div>
  );
};

export default Index;
