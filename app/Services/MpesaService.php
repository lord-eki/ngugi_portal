<?php

namespace App\Services;

use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class MpesaService
{




    public function accessToken(): string
    {
        return Cache::remember('mpesa_access_token', 3500, function () {
            $baseUrl = config('services.mpesa.base_url');

            $response = Http::withBasicAuth(
                config('services.mpesa.consumer_key'),
                config('services.mpesa.consumer_secret')
            )->get($baseUrl . '/oauth/v1/generate?grant_type=client_credentials');

            if ($response->failed()) {
                Log::error('Mpesa OAuth failed', ['response' => $response->json()]);
                throw new RuntimeException('Unable to authenticate with Mpesa');
            }

            return $response->json('access_token');
        });
    }



    public function registerUrls(): array
    {
        $response = Http::withToken($this->accessToken())->post(config('services.mpesa.base_url') . '/mpesa/c2b/v2/registerurl', [
            'ShortCode' => config('services.mpesa.shortcode'),
            'ResponseType' => 'Completed',
            'ConfirmationURL' => config('services.mpesa.confirmation_url'),
            'ValidationURL' => config('services.mpesa.validation_url'),
        ]);

        if ($response->failed()) {
            Log::error('Mpesa URL registration failed', ['response' => $response->json()]);

            throw new RuntimeException($response->json('errorMessage', 'Unable to register Mpesa URLs'));
        }

        return $response->json();
    }

    public function stkPush(Payment $payment, string $phone, float $amount): array
    {
        $shortcode = config('services.mpesa.shortcode');
        $timestamp = now()->format('YmdHis');
        $password  = base64_encode($shortcode . config('services.mpesa.passkey') . $timestamp);

        $response = Http::withToken($this->accessToken())
            ->post(config('services.mpesa.base_url') . '/mpesa/stkpush/v1/processrequest', [
                'BusinessShortCode' => $shortcode,
                'Password'          => $password,
                'Timestamp'         => $timestamp,
                'TransactionType'   => 'CustomerBuyGoodsOnline',
                'Amount'            => (int) round($amount),
                'PartyA'            => $phone,
                'PartyB'            => $shortcode,
                'PhoneNumber'       => $phone,
                'CallBackURL'       => config('services.mpesa.stk_callback_url'),
                'AccountReference'  => (string) $payment->id,
                'TransactionDesc'   => 'Water order payment #' . $payment->order_id,
            ]);

        if ($response->failed()) {
            Log::error('Mpesa STK push failed', ['response' => $response->json()]);
            throw new RuntimeException($response->json('errorMessage', 'Unable to initiate Mpesa payment'));
        }

        $data = $response->json();

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
            "ResultCode" => "0",
            "ResultDesc" => "Accepted"
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

            if (!$payment) {
                Log::warning('STK callback for unknown CheckoutRequestID', ['id' => $checkoutRequestId]);
                return;
            }

            if ($payment->status !== 'pending') {
                return;
            }

            if ((int) $resultCode !== 0) {
                $payment->update([
                    'status'              => 'failed',
                    'result_code'         => $resultCode,
                    'result_description'  => $resultDesc,
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
