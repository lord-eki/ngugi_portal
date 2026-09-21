<?php

namespace App\Actions\Riders;

use App\Models\Order;
use App\Models\RiderEarning;

class RecordRiderEarningAction
{
    public function handle(Order $order): ?RiderEarning
    {
        $order->loadMissing('delivery.rider');
        $rider = $order->delivery?->rider;

        if (! $rider) {
            return null;
        }

        if (RiderEarning::where('order_id', $order->id)->exists()) {
            return null;
        }

        $percentage = $rider->commissionRate();
        $amount     = (int) round($order->grand_total * $percentage / 100);

        return RiderEarning::create([
            'rider_id'   => $rider->id,
            'order_id'   => $order->id,
            'percentage' => $percentage,
            'amount'     => $amount,
            'status'     => 'available',
        ]);
    }
}