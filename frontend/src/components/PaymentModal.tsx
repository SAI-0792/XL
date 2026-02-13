import React, { useState } from 'react';

interface PaymentModalProps {
    amount: number;
    onSuccess: () => void;
    onCancel: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ amount, onSuccess, onCancel }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentStep, setPaymentStep] = useState<'CHOICE' | 'PROCESSING' | 'SUCCESS'>('CHOICE');

    const handleConfirmPayment = () => {
        setIsProcessing(true);
        setPaymentStep('PROCESSING');

        // Simulate payment gateway delay
        setTimeout(() => {
            setPaymentStep('SUCCESS');
            setTimeout(() => {
                onSuccess();
            }, 1500);
        }, 2000);
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
            <div className="relative w-full max-w-md bg-[#111318] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden group">

                {/* Visual Flair */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[60px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/10 blur-[50px] rounded-full translate-y-1/2 -translate-x-1/2"></div>

                {paymentStep === 'CHOICE' && (
                    <div className="relative z-10 animate-slide-up">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h3 className="text-2xl font-bold text-white mb-1">Final Payment</h3>
                                <p className="text-gray-500 text-xs font-mono tracking-widest uppercase">Transaction ID: #PX-{Math.floor(Math.random() * 90000) + 10000}</p>
                            </div>
                            <button onClick={onCancel} className="p-2 hover:bg-white/5 rounded-full transition">
                                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="bg-white/5 rounded-3xl p-8 mb-8 text-center border border-white/5 group-hover:border-white/10 transition-colors">
                            <span className="text-gray-400 text-sm block mb-2 uppercase tracking-[0.2em] font-black">Amount Payable</span>
                            <div className="text-6xl font-black text-white flex items-center justify-center tracking-tighter">
                                <span className="text-2xl mr-2 font-light text-gray-500">₹</span>
                                {amount}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 bg-black/40 border border-white/5 rounded-2xl flex items-center space-x-4 cursor-pointer hover:border-blue-500/40 transition">
                                <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-2xl">💳</div>
                                <div className="flex-1 text-left">
                                    <div className="text-sm font-bold text-white">Direct Credit Card</div>
                                    <div className="text-[10px] text-gray-500 uppercase tracking-widest">VISA / MASTERCARD</div>
                                </div>
                                <div className="w-5 h-5 border-2 border-blue-500 rounded-full flex items-center justify-center">
                                    <div className="w-2.5 h-2.5 bg-blue-500 rounded-full"></div>
                                </div>
                            </div>

                            <div className="p-4 bg-black/40 border border-white/5 rounded-2xl flex items-center space-x-4 opacity-50 cursor-not-allowed">
                                <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-2xl">📱</div>
                                <div className="flex-1 text-left">
                                    <div className="text-sm font-bold text-white">Unified Payment (UPI)</div>
                                    <div className="text-[10px] text-gray-500 uppercase tracking-widest">Unavailable</div>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleConfirmPayment}
                            className="w-full mt-10 py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black tracking-widest uppercase text-sm shadow-[0_20px_40px_rgba(37,99,235,0.2)] transition transform active:scale-95"
                        >
                            Confirm Deposit
                        </button>
                    </div>
                )}

                {paymentStep === 'PROCESSING' && (
                    <div className="relative z-10 py-12 flex flex-col items-center justify-center animate-pulse">
                        <div className="w-20 h-20 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-8"></div>
                        <h3 className="text-xl font-bold text-white mb-2">Authenticating Gateway</h3>
                        <p className="text-gray-500 font-mono text-xs tracking-widest">TLS_SECURE_LAYER_V3</p>
                    </div>
                )}

                {paymentStep === 'SUCCESS' && (
                    <div className="relative z-10 py-12 flex flex-col items-center justify-center animate-fade-in">
                        <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(34,197,94,0.3)]">
                            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">Payment Authorized</h3>
                        <p className="text-gray-500 text-sm">Transfer Complete. Updating records...</p>
                    </div>
                )}

            </div>
        </div>
    );
};

export default PaymentModal;
