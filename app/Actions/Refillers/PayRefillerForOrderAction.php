<?php

namespace App\Actions\Refillers;

use App\Actions\Mpesa\InitiateB2CTransferAction;
use App\Models\Order;
use App\Models\RefillerPayout;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class PayRefillerForOrderAction
{
    public function handle(Order $order, InitiateB2CTransferAction $b2c): ?RefillerPayout
    {
        $order->loadMissing('refiller');
        $refiller = $order->refiller;

        if (! $refiller || ! $refiller->is_active) {
            return null;
        }

        if (RefillerPayout::where('order_id', $order->id)->exists()) {
            return null; // already paid — guards against double-trigger
        }

        $percentage = (float) $refiller->commission_percentage;
        $amount     = (int) round($order->grand_total * $percentage / 100);

        $payout = RefillerPayout::create([
            'refiller_id' => $refiller->id,
            'order_id'    => $order->id,
            'percentage'  => $percentage,
            'amount'      => $amount,
            'phone'       => $refiller->phone,
            'status'      => 'processing',
        ]);

        try {
            $data = $b2c->handle($refiller->phone, $amount, 'Refill share', "Order #{$order->id}");

            $payout->update([
                'originator_conversation_id' => $data['OriginatorConversationID'] ?? null,
                'conversation_id'            => $data['ConversationID'] ?? null,
            ]);
        } catch (RuntimeException $e) {
            $payout->update(['status' => 'failed', 'result_description' => $e->getMessage()]);
            Log::error('Refiller payout failed to initiate', ['order_id' => $order->id]);
        }

        return $payout;
    }
}