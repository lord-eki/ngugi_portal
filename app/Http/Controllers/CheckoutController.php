<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCheckoutRequest;
use App\Models\Checkout;
use App\Services\MpesaService;
use App\Services\PricingService;
use Illuminate\Http\JsonResponse;
use Throwable;

class CheckoutController extends Controller
{
    public function store(StoreCheckoutRequest $request, PricingService $pricing, MpesaService $mpesa): JsonResponse
    {
        $data = $request->validated();

        if ($existing = Checkout::where('idempotency_key', $data['idempotency_key'])->first()) {
            return response()->json(['public_id' => $existing->public_id, 'status' => $existing->status]);
        }

        $quote = $pricing->quote($data['order']);        

        $checkout = Checkout::create([
            'idempotency_key' => $data['idempotency_key'],
            'phone'           => $data['phone'],
            'amount'          => $quote['grand_total'],
            'payload'         => ['order' => $data['order'], 'delivery' => $data['delivery'], 'quote' => $quote],
            'expires_at'      => now()->addMinutes(3),
        ]);

        try {
            $mpesa->stkPushForCheckout($checkout);
        } catch (Throwable $e) {
            report($e);
            $checkout->update(['status' => 'failed', 'failure_reason' => 'Could not reach M-Pesa.']);

            return response()->json(['message' => 'We could not reach M-Pesa. Please try again in a moment.'], 502);
        }

        return response()->json(['public_id' => $checkout->public_id, 'amount' => $checkout->amount], 201);
    }

    public function status(Checkout $checkout): JsonResponse
    {
        return response()->json([
            'status'   => $checkout->status,      
            'message'  => $checkout->failure_reason,
            'order_id' => $checkout->order_id,
        ]);
    }
}