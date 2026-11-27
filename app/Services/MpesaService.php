<?php

namespace App\Services;

use App\Actions\Orders\CreateOrderFromCheckoutAction;
use App\Models\Checkout;
use App\Models\Payment;
use Iankumu\Mpesa\Facades\Mpesa;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class MpesaService
{

    public function accessToken(): string
    {
        return Mpesa::generateAccessToken();
    }


    public function stkPushForCheckout(Checkout $checkout): void
    {
        $response = Mpesa::stkpush(
            $checkout->phone,
            (int) $checkout->amount,
            'BH' . $checkout->id,
            config('mpesa.callbacks.callback_url'),
            'CustomerPayBillOnline'
        );

        $data = $response->json();

        if ($response->failed() || ($data['ResponseCode'] ?? null) !== '0') {
            Log::error('Mpesa STK push failed', ['checkout' => $checkout->id, 'response' => $data]);
            throw new RuntimeException($data['errorMessage'] ?? 'Unable to initiate Mpesa payment');
        }

        $checkout->update([
            'merchant_request_id' => $data['MerchantRequestID'] ?? null,
            'checkout_request_id' => $data['CheckoutRequestID'] ?? null,
        ]);
    }


    public function handleStkCallback(Request $request): void
    {
        Log::info('M-Pesa STK Callback:', $request->all());

        $cb = $request->input('Body.stkCallback');

        if (! $cb || empty($cb['CheckoutRequestID'])) {
            Log::warning('Malformed STK callback payload', $request->all());
            return;
        }

        DB::transaction(function () use ($cb) {
            $checkout = Checkout::where('checkout_request_id', $cb['CheckoutRequestID'])
                ->lockForUpdate()
                ->first();

            if (! $checkout || $checkout->status === 'paid') {
                return;
            }

            if ((int) ($cb['ResultCode'] ?? -1) !== 0) {
                if ($checkout->status === 'pending') {
                    $checkout->update([
                        'status'         => 'failed',
                        'failure_reason' => $cb['ResultDesc'] ?? 'The payment was not completed.',
                    ]);
                }
                return;
            }

            $meta    = collect($cb['CallbackMetadata']['Item'] ?? [])->pluck('Value', 'Name');
            $paid    = (int) round((float) $meta->get('Amount', 0));
            $receipt = $meta->get('MpesaReceiptNumber');

            if ($paid < $checkout->amount) {
                Log::critical('STK amount mismatch', [
                    'checkout' => $checkout->id,
                    'expected' => $checkout->amount,
                    'paid' => $paid,
                    'receipt' => $receipt,
                ]);
                $checkout->update([
                    'status'               => 'failed',
                    'mpesa_receipt_number' => $receipt,
                    'failure_reason'       => 'The amount received did not match the order total. Please contact support with your M-Pesa message.',
                ]);
                return;
            }


            $order = app(CreateOrderFromCheckoutAction::class)->handle($checkout, $receipt, $cb);

            $checkout->update([
                'status'               => 'paid',
                'order_id'             => $order->id,
                'mpesa_receipt_number' => $receipt,
            ]);
        });
    }
}
