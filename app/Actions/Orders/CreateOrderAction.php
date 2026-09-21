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
  
    private const BOTTLE_SIZES = [
        '500ml' => ['refill' => 15,  'new' => 30,  'has_bundle' => true],
        '1L'    => ['refill' => 25,  'new' => 50,  'has_bundle' => true],
        '5L'    => ['refill' => 80,  'new' => 150, 'has_bundle' => false],
        '10L'   => ['refill' => 120, 'new' => 250, 'has_bundle' => false],
        '15L'   => ['refill' => 160, 'new' => 350, 'has_bundle' => false],
        '20L'   => ['refill' => 200, 'new' => 450, 'has_bundle' => false],
    ];

    private const DELIVERY_FEE    = 150;
    private const INSTANT_FEE_ADD = 200;

    public $mpesaService;

    public function __construct(MpesaService $mpesaService)
    {
        $this->mpesaService = $mpesaService;
    }

    private function normalizePhoneNumber(string $phone): string
    {
        $phone = preg_replace('/\D/', '', $phone);

        if (str_starts_with($phone, '0')) {
            return '254' . substr($phone, 1);
        }
        if (str_starts_with($phone, '254')) {
            return $phone;
        }
        if (str_starts_with($phone, '7') || str_starts_with($phone, '1')) {
            return '254' . $phone;
        }

        throw new InvalidArgumentException('Invalid Kenyan phone number');
    }


    private function priceOrder(array $orderData): array
    {
        $items = [];
        $sub = 0;

        $priceLoop = function (array $sizes, string $type) use (&$items, &$sub) {
            foreach ($sizes as $sizeId => $entry) {
                $qty = (int) ($entry['qty'] ?? 0);
                if ($qty <= 0 || !isset(self::BOTTLE_SIZES[$sizeId])) {
                    continue;
                }

                $priceRow  = self::BOTTLE_SIZES[$sizeId];
                $unitPrice = $type === 'refill' ? $priceRow['refill'] : $priceRow['new'];
                $isBundle  = $type === 'new' && $priceRow['has_bundle'] && ($entry['isBundle'] ?? false);

                if ($isBundle) {
                    $bundleQty  = max(1, (int) ($entry['bundleQty'] ?? 1));
                    $bundleSize = (int) ($entry['bundleSize'] ?? 0);
                    $amount     = $bundleSize * $bundleQty * $unitPrice;
                } else {
                    $bundleQty = null;
                    $bundleSize = null;
                    $amount = $qty * $unitPrice;
                }

                $items[] = [
                    'type'            => $type,
                    'size'            => $sizeId,
                    'quantity'        => $qty,
                    'is_bundle'       => $isBundle,
                    'bundle_quantity' => $bundleQty,
                    'bundle_size'     => $bundleSize,
                    'amount'          => $amount,
                ];
                $sub += $amount;
            }
        };

        $priceLoop($orderData['newSizes'] ?? [], 'new');
        $priceLoop($orderData['refillSizes'] ?? [], 'refill');

        $charges = [];
        if ($sub > 0) {
            $charges[] = ['label' => 'Delivery fee', 'amount' => self::DELIVERY_FEE];
            if (($orderData['deliverySpeed'] ?? 'standard') === 'instant') {
                $charges[] = ['label' => 'Instant delivery fee', 'amount' => self::INSTANT_FEE_ADD];
            }
        }

        $chargeTotal = array_sum(array_column($charges, 'amount'));

        return [
            'items'       => $items,
            'charges'     => $charges,
            'grand_total' => $sub + $chargeTotal,
        ];
    }

    public function handle(array $data)
    {
        $priced = $this->priceOrder($data['order'] ?? []);

        if (empty($priced['items'])) {
            return response()->json(['message' => 'Order has no valid items'], 422);
        }

        DB::beginTransaction();

        try {
            $order = Order::create([
                'delivery_speed' => $data['order']['deliverySpeed'],
                'grand_total'    => $priced['grand_total'], 
            ]);

            foreach ($priced['items'] as $item) {
                OrderItem::create([
                    'order_id'        => $order->id,
                    'type'            => $item['type'],
                    'size'            => $item['size'],
                    'quantity'        => $item['quantity'],
                    'is_bundle'       => $item['is_bundle'],
                    'bundle_quantity' => $item['bundle_quantity'],
                    'bundle_size'     => $item['bundle_size'],
                    'amount'          => $item['amount'],
                ]);
            }

            foreach ($priced['charges'] as $charge) {
                OrderCharge::create([
                    'order_id' => $order->id,
                    'label'    => $charge['label'],
                    'amount'   => $charge['amount'],
                    'status'   => 'pending',
                ]);
            }

            Delivery::create([
                'order_id'        => $order->id,
                'location_mode'   => $data['delivery']['locationMode'],
                'manual_address'  => $data['delivery']['pinAddress'],
                'recepient_name'  => $data['delivery']['recipientName'],
                'recepient_phone' => $data['delivery']['recipientPhone'],
                'recepient_email' => $data['delivery']['recipientEmail'] ?? null, 
                'schedule_type'   => $data['delivery']['scheduleType'],
                'scheduled_time'  => $data['delivery']['scheduledTime'],
                'contact_name'    => $data['delivery']['contactName'] ?? null,
                'contact_phone'   => $data['delivery']['contactPhone'] ?? null,
                'contact_email'   => $data['delivery']['contactEmail'] ?? null, 
                'notes'           => $data['delivery']['notes'],
            ]);

            $payment = Payment::create([
                'order_id'    => $order->id,
                'method'      => $data['payment']['method'],
                'phone'       => $data['payment']['phone'] ?? null,
                'till_code'   => $data['payment']['tillCode'] ?? null,
                'card_number' => $data['payment']['cardNumber'] ?? null,
                'card_expiry' => $data['payment']['cardExpiry'] ?? null,
                'status'      => 'pending',
            ]);

            DB::commit();

        } catch (Throwable $e) {
            DB::rollBack();
            Log::error($e);

            return response()->json([
                'message' => 'Failed to create order',
                'error'   => $e->getMessage(),
            ], 500);
        }

     
        if (in_array($data['payment']['method'], ['mpesa-till', 'mpesa-stk'], true)) {
            try {
                $phone = $this->normalizePhoneNumber($data['payment']['phone']);

                $response = $this->mpesaService->stkPush($payment, $phone, (float) $order->grand_total);

                return response()->json([
                    'message'  => 'Order created, payment prompt sent',
                    'order_id' => $order->id,
                ], 201);

            } catch (Throwable $e) {
                Log::error('STK push failed after order creation', [
                    'order_id' => $order->id,
                    'error'    => $e->getMessage(),
                ]);

                $payment->update(['status' => 'failed', 'result_description' => $e->getMessage()]);

                return response()->json([
                    'message'  => 'Order created, but we could not reach M-Pesa. Please retry payment.',
                    'order_id' => $order->id,
                    'payment_status' => 'failed',
                ], 201);
            }
        }

        return response()->json([
            'message'  => 'Order created successfully',
            'order_id' => $order->id,
        ], 201);
    }
}