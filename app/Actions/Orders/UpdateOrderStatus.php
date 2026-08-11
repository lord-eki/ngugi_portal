<?php
namespace App\Actions\Orders;

use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class UpdateOrderStatus

{
    public function handle(Request $request , Order $order)
    {
        abort_if(! Auth::check(), 403);

        $data = $request->validate([
            'status' => ['required', 'in:confirmed,out_for_delivery,delivered,cancelled'],
        ]);

        $order->update(['status' => $data['status']]);

        return back()->with('success', 'Order status updated.');
    }
}