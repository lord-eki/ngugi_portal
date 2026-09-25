<?php

namespace App\Actions\Orders;

use App\Models\Order;
use App\Models\User;
use Illuminate\Http\RedirectResponse;

class AssignRiderAction
{
    public function handle(Order $order, ?int $riderId): RedirectResponse
    {
        if ($riderId !== null) {
            User::where('id', $riderId)->where('role', 'rider')->where('is_active', true)->whereNotNull('email_verified_at')->firstOrFail();
        }

        $order->delivery()->update([
            'rider_id'    => $riderId,
            'assigned_at' => $riderId ? now() : null,
        ]);

        return back()->with('success', $riderId ? 'Order assigned to rider.' : 'Rider unassigned.');
    }
}
