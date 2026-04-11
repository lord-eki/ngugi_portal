import { useState } from "react";
import StepOrder from "./StepOrder";
import StepDelivery from "./StepDelivery";
import StepPayment from "./StepPayment";
import StepSuccess from "./StepSuccess";


export default function Wizard({ onClose }) {
    const [step, setStep] = useState(1);
    const [orderData, setOrderData] = useState({});
    const [deliveryData, setDeliveryData] = useState({});
    const [paymentData, setPaymentData] = useState({});

    const next = () => setStep(s => s + 1);
    const back = () => setStep(s => s - 1);


    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-xl flex flex-col p-6 relative">
                <button onClick={onClose} className="absolute top-4 right-4 pr-10">X</button>

                <div className="overflow-y-auto p-6 flex-1">

                    {step === 1 && (<StepOrder data={orderData} setData={setOrderData} onNext={next} />)}
                    {step === 2 && (<StepDelivery data={deliveryData} setData={setDeliveryData} onNext={next} onBack={back} />)}
                    {step === 3 && (<StepPayment data={paymentData} setData={setPaymentData} onNext={next} onBack={back} />)}
                    {step === 4 && <StepSuccess onClose={onClose}/>}
                </div>



            </div>

        </div>
    );
}