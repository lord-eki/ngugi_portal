<?php

namespace App\Actions\Orders;

use App\Models\Order;

class PaymentStatusAction
{
    public function handle(Order $order)
    {
        $payment = $order->payment;

        if (! $payment) {
            return response()->json([
                'status' => 'failed',
                'message' => 'No payment record found',
            ], 404);
        }

        return response()->json([
            'status' => $payment->status,
            'message' => $payment->result_description,
        ]);
    }
}
