<?php

namespace App\Services;

use App\Models\Payment;
use Iankumu\Mpesa\Facades\Mpesa;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class MpesaService
{
    public function registerUrls(): array
    {
        $response = Mpesa::c2bregisterURLS(
            config('mpesa.till_number'),
            config('mpesa.callbacks.c2b_confirmation_url'),
            config('mpesa.callbacks.c2b_validation_url'),
            'C2B'
        );

        $result = $response->json();

        if ($response->failed()) {
            Log::error('Mpesa URL registration failed', ['response' => $result]);
            throw new RuntimeException($result['errorMessage'] ?? 'Unable to register Mpesa URLs');
        }

        return $result;
    }

    public function stkPush(Payment $payment, string $phone, float $amount): array
    {
        $response = Mpesa::stkpush(
            $phone,
            (int) round($amount),
            (string) $payment->id,                          
            config('mpesa.callbacks.callback_url'),
            Mpesa::TILL                                      
        );

        $data = $response->json();

        if ($response->failed() || ($data['ResponseCode'] ?? null) !== '0') {
            Log::error('Mpesa STK push failed', ['response' => $data]);
            throw new RuntimeException($data['errorMessage'] ?? 'Unable to initiate Mpesa payment');
        }

        $payment->update([
            'merchant_request_id' => $data['MerchantRequestID'] ?? null,
            'checkout_request_id' => $data['CheckoutRequestID'] ?? null,
            'status'              => 'pending',
        ]);

        return $data;
    }

    public function validateURL(Request $request)
    {
        Log::info('M-Pesa Validation:', $request->all());

        return response()->json([
            'ResultCode' => '0',
            'ResultDesc' => 'Accepted',
        ]);
    }

    public function handleStkCallback(Request $request): void
    {
        Log::info('M-Pesa STK Callback:', $request->all());

        $stkCallback = $request->input('Body.stkCallback');
        if (!$stkCallback) {
            Log::warning('Malformed STK callback payload', $request->all());
            return;
        }

        $checkoutRequestId = $stkCallback['CheckoutRequestID'] ?? null;
        $resultCode        = $stkCallback['ResultCode'] ?? null;
        $resultDesc        = $stkCallback['ResultDesc'] ?? null;

        if (!$checkoutRequestId) {
            return;
        }

        DB::transaction(function () use ($checkoutRequestId, $resultCode, $resultDesc, $stkCallback) {
            $payment = Payment::where('checkout_request_id', $checkoutRequestId)
                ->lockForUpdate()
                ->first();

            if (!$payment || $payment->status !== 'pending') {
                return;
            }

            if ((int) $resultCode !== 0) {
                $payment->update([
                    'status'             => 'failed',
                    'result_code'        => $resultCode,
                    'result_description' => $resultDesc,
                ]);
                return;
            }

            $metadata = collect($stkCallback['CallbackMetadata']['Item'] ?? [])
                ->pluck('Value', 'Name');

            $payment->update([
                'status'               => 'paid',
                'result_code'          => $resultCode,
                'result_description'   => $resultDesc,
                'mpesa_receipt_number' => $metadata->get('MpesaReceiptNumber'),
            ]);

            $payment->order()->update(['status' => 'confirmed']);
        });
    }
}