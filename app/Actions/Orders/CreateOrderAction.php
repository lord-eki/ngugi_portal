<?php

namespace App\Actions\Orders;

use App\Models\Delivery;
use App\Models\Order;
use App\Models\OrderCharge;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Services\MpesaService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use InvalidArgumentException;
use Throwable;

class CreateOrderAction
{

public $mpesaService;

public  function __construct(MpesaService $mpesaService) {
    $this->mpesaService = $mpesaService;
}
    private function normalizePhoneNumber(string $phone): string
    {
        $phone = preg_replace('/\D/', '', $phone);

        if (str_starts_with($phone, '0')) {
            return '254'.substr($phone, 1);
        }
        if (str_starts_with($phone, '254')) {
            return $phone;
        }
        if (str_starts_with($phone, '7' || str_starts_with($phone, '1'))) {
            return '254'.$phone;
        }

        throw new InvalidArgumentException('Invalid Kenyan Number');
    }

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
                        'status' => 'pending',
                    ]);
                }
            }

            // delvery info
            Delivery::create([
                'order_id' => $order->id,
                'location_mode' => $data['delivery']['locationMode'],
                'manual_address' => $data['delivery']['pinAddress'],
                'recepient_name' => $data['delivery']['recipientName'],
                'recepient_phone' => $data['delivery']['recipientPhone'],
                'schedule_type' => $data['delivery']['scheduleType'],
                'scheduled_time' => $data['delivery']['scheduledTime'],
                'contact_name' => $data['delivery']['contactName'] ?? null,
                'contact_phone' => $data['delivery']['contactPhone'] ?? null,
                'notes' => $data['delivery']['notes'],
            ]);

            // payment

            $payment = Payment::create([
                'order_id' => $order->id,
                'method' => $data['payment']['method'],
                'phone' => $data['payment']['phone'] ?? null,
                'till_code' => $data['payment']['tillCode'] ?? null,
                'transaction_code' => $data['payment']['transactionCode'] ?? null,
                'card_number' => $data['payment']['cardNumber'] ?? null,
                'card_expiry' => $data['payment']['cardExpiry'] ?? null,
                'card_cvv' => $data['payment']['cardCvv'] ?? null,
                'status' => $data['payment']['method'] === 'mpesa-till' ? 'pending' : 'pending',
            ]);

            DB::commit();

            if ($data['payment']['method'] === 'mpesa-till') {
                $phone = $this->normalizePhoneNumber($data['payment']['phone']);

                $response =  $this->mpesaService->c2b(amount: (int) $order->grand_total, msisdn: $phone, billrefnumber: 'Payment for ORDER-'.$order->id);


                $payment->update([
                    'checkout_request_id' => $response['CheckoutRequestID'] ?? null,
                    'merchant_request_id' => $response['MerchantRequestID'] ?? null,
                ]);
            }

            return response()->json([
                'message' => 'Order created successfully',
                'order_id' => $order->id,
            ], 201);

        } catch (Throwable $e) {

            Log::error($e);

            return response()->json([
                'message' => 'Failed to create order',
                'error' => $e->getMessage(),
            ], 500);

        }

    }
}
