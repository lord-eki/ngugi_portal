<?php

namespace App\Actions\Orders;

use App\Models\Checkout;
use App\Models\Delivery;
use App\Models\Order;
use App\Models\OrderCharge;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Support\Phone;

class CreateOrderFromCheckoutAction
{
    public function handle(Checkout $checkout, ?string $receipt, array $callback = []): Order
    {
        $p = $checkout->payload;
        $q = $p['quote'];
        $d = $p['delivery'];

        $order = Order::create([
            'delivery_speed' => $p['order']['deliverySpeed'],
            'grand_total'    => $q['grand_total'],
            'status'         => 'confirmed',          
        ]);

        foreach ($q['items'] as $i) {
            OrderItem::create([
                'order_id'        => $order->id,
                'type'            => $i['type'],
                'size'            => $i['size'],
                'quantity'        => $i['qty'],
                'unit_price'      => $i['unit'],
                'is_bundled'      => $i['isBundle'],
                'bundle_quantity' => $i['bundleQty'],
                'bundle_size'     => $i['pack'],
                'amount'          => $i['amount'],
            ]);
        }

        foreach ($q['charges'] as $c) {
            OrderCharge::create(['order_id' => $order->id, 'label' => $c['label'], 'amount' => $c['amount']]);
        }

        Delivery::create([
            'order_id'        => $order->id,
            'location_mode'   => $d['locationMode'],
            'pin_address'     => $d['pinAddress'] ?? null,
            'manual_address'  => $d['manualAddress'] ?? null,
            'pin_lat'         => $d['pinLocation']['lat'] ?? null,
            'pin_lng'         => $d['pinLocation']['lng'] ?? null,
            'recepient_name'  => $d['recipientName'] ?? null,
            'recepient_phone' => Phone::normalize($d['recipientPhone'] ?? null) ?? ($d['recipientPhone'] ?? null),
            'recepient_email' => $d['recipientEmail'] ?? null,
            'contact_name'    => $d['contactName'] ?? null,
            'contact_phone'   => Phone::normalize($d['contactPhone'] ?? null) ?? ($d['contactPhone'] ?? null),
            'contact_email'   => $d['contactEmail'] ?? null,
            'schedule_type'   => $d['scheduleType'],
            'scheduled_time'  => $d['scheduledTime'] ?? null,
            'notes'           => $d['notes'] ?? null,
        ]);

        Payment::create([
            'order_id'             => $order->id,
            'method'               => 'mpesa-stk',
            'phone'                => $checkout->phone,
            'status'               => 'verified',
            'merchant_request_id'  => $checkout->merchant_request_id,
            'checkout_request_id'  => $checkout->checkout_request_id,
            'mpesa_receipt_number' => $receipt,
            'result_code'          => 0,
            'result_description'   => $callback['ResultDesc'] ?? null,
        ]);

        return $order;
    }
}