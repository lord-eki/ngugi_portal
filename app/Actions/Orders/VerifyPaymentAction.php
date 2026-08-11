<?php

namespace App\Actions\Orders;

use App\Models\Order;
use Illuminate\Support\Facades\Auth;

class VerifyPaymentAction
{
    public function handle(Order $order)
    {
        abort_if(! Auth::check(), 403);

        $payment = $order->payment;

        abort_if(! $payment, 404, 'No payment record found for this order.');

        abort_if(
            $payment->status !== 'pending',
            422,
            'Payment has already been verified or is not in a verifiable state.'
        );

        $payment->update(['status' => 'verified']);

        if ($order->status === 'pending') {
            $order->update(['status' => 'confirmed']);
        }

        return back()->with('success', "Payment for order #{$order->id} verified successfully.");
    }
}
