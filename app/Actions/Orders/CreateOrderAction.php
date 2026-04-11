<?php

namespace App\Actions\Orders;

use App\Models\Delivery;
use App\Models\Order;
use App\Models\OrderCharge;
use App\Models\OrderItem;
use App\Models\Payment;
use Illuminate\Support\Facades\DB;
use Throwable;

class CreateOrderAction
{
    public function handle(array $data)
    {

        DB::beginTransaction();

        try {

            $order = Order::create([
                'delivery_speed' => $data['order']['deliverySpeed'],
                'grand_total' => $data['order']['grandTotal'],

            ]);

            // store order items (new bottles)
            foreach ($data['order']['newSizes'] ?? [] as $size => $item) {
                if (($item['qty'] ?? 0) > 0) {
                    OrderItem::create([
                        'order_id' => $order->id,
                        'type' => 'new',
                        'size' => $size,
                        'quantity' => $item['qty'] ?? false,
                        'is_bundle' => $item['bundleQty'] ?? null,
                        'bundle_quantity' => $item['bundleQty'] ?? null,
                        'bundle_size' => $item['bundleSize'] ?? null,
                        'amount' => 0,
                    ]);
                }
            }

            // store order items - refill bottles
            foreach ($data['order']['refillSizes'] ?? [] as $size => $item) {
                if (($item['qty'] ?? 0) > 0) {
                    OrderItem::create([
                        'order_id' => $order->id,
                        'type' => 'refill',
                        'size' => $size,
                        'quantity' => $item['qty'],
                        'is_bundle' => $item['isBundle'] ?? false,
                        'bundle_qty' => $item['bundleQty'] ?? null,
                        'bundle_size' => $item['bundleSize'] ?? null,
                        'amount' => 0,
                    ]);
                }
            }

            // store charges
            foreach ($data['order']['lineItems'] ?? [] as $line) {
                if (str_contains(strtolower($line['label']), 'delivery')) {
                    OrderCharge::create([
                        'order_id' => $order->id,
                        'label' => $line['label'],
                        'amount' => $line['amount'],
                    ]);
                }
            }

            // delvery info
            Delivery::create([
                'order_id' => $order->id,
                'location_mode' => $data['delivery']['location_mode'],
                'manual_address' => $data['delivery']['pinAddress'],
                'recepient_name' => $data['delivery']['recepientName'],
                'recepient_phone' => $data['delivery']['recepientPhone'],
                'schedule_type' => $data['delivery']['scheduleType'],
                'scheduled_time' => $data['delivery']['scheduledTime'],
                'notes' => $data['delivery']['notes'],
            ]);

            // payment

            Payment::create([
                'order_id' => $order->id,
                'method' => $data['payment']['method'],
                'phone' => $data['payment']['phone'],
                'till_code' => $data['payment']['tillCode'],
                'transaction_code' => $data['payment']['transactionCode'],
                'card_number' => $data['payment']['cardNumber'],
                'card_expiry' => $data['payment']['cardExpiry'],
                'card_cvv' => $data['payment']['cardCvv'],
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Order created successfully',
                'order_id' => $order->id,
            ], 201);

        } catch (Throwable $e) {
            DB::rollback();

            return response()->json([
                'message' => 'Failed to create order',
                'error' => $e->getMessage(),
            ], 500);

        }

    }
}
