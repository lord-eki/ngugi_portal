<?php

namespace App\Actions\Orders;

use App\Models\Order;
use App\Support\AuditLogger;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class VerifyPaymentAction
{
    public function handle(Order $order)
    {
        abort_if(! Auth::check(), 403);
        abort_unless(Auth::user()->isAdmin(), 403);

        $payment = $order->payment;
        abort_if(! $payment, 404, 'No payment record found for this order.');

        abort_if(
            $payment->method === 'mpesa-till',
            422,
            'M-Pesa payments confirm automatically once Safaricom sends the callback — there is nothing to verify manually here.'
        );

        abort_if(
            $payment->status !== 'pending',
            422,
            'Payment has already been verified or is not in a verifiable state.'
        );

        $payment->update(['status' => 'verified']);

        AuditLogger::log('payment.manually_verified', $order, ['payment_id' => $payment->id]);


        if ($order->status === 'pending') {
            $order->update(['status' => 'confirmed']);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => "Payment for order #{$order->id} verified successfully."]);

        return back();
    }
}
