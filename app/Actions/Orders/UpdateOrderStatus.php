<?php

namespace App\Actions\Orders;

use App\Actions\Riders\RecordRiderEarningAction;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class UpdateOrderStatus
{
    private const RIDER_TRANSITIONS = [
        'confirmed'        => ['out_for_delivery'],
        'out_for_delivery' => ['delivered'],
    ];

    public function handle(Request $request, Order $order)
    {
        $user = Auth::user();
        abort_if(! $user, 403);

        $data = $request->validate([
            'status' => ['required', 'in:confirmed,out_for_delivery,delivered,cancelled'],
        ]);

        if ($user->isRider()) {
            $order->loadMissing('delivery');
            abort_if($order->delivery?->rider_id !== $user->id, 403, 'This order is not assigned to you.');

            $allowed = self::RIDER_TRANSITIONS[$order->status] ?? [];
            abort_unless(in_array($data['status'], $allowed, true), 403, "You can't make that status change.");
        } else {
            abort_unless($user->isAdmin(), 403);
        }

        $order->update(['status' => $data['status']]);

        if ($data['status'] === 'delivered') {
            app(RecordRiderEarningAction::class)->handle($order);
        }

        return back()->with('success', 'Order status updated.');
    }
}
