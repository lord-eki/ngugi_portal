<?php

namespace App\Actions\Orders;

use App\Models\Order;
use Illuminate\Support\Facades\Auth;

class CancelOrderAction
{
    public function handle(Order $order)
    {
        abort_if($order->user_id !== Auth::id(), 403);

        if (! $order->canBeCancelled()) {
            return back()->withErrors(['order' => 'This order cannot be cancelled.']);
        }

        $order->update(['status' => 'cancelled']);

        return back()->with('success', 'Order cancelled.');
    }
}
