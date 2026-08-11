<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class MpesaService
{
    /**
     * Create a new class instance.
     */
    public function __construct()
    {
        //
    }

    public function accessToken(): string
    {
        $baseUrl = config('services.mpesa.base_url');

        $response = Http::withBasicAuth(config('services.mpesa.consumer_key'), config('services.mpesa.consumer_secret'))->get($baseUrl.'/oauth/v1/generate?grant_type=client_credentials');

        if ($response->failed()) {
            Log::error('Mpesa OAuth failed', ['response' => $response->json()]);

            throw new RuntimeException('Unable to authenticate with Mpesa');
        }

        return $response->json('access_token');
    }

    public function stkPush(string $phone, int $amount, string $accountReference, string $description): array
    {

        $timestamp = now()->format('YmdHis');

        $password = base64_encode(config('services.mpesa.shortcode').config('services.mpesa.passkey').$timestamp);

        $response = Http::withToken($this->accessToken())->post(config('services.mpesa.base_url').'/mpesa/stkpush/v1/processrequest', [
            'BusinessShortCode' => config('services.mpesa.shortcode'),
            'Password' => $password,
            'Timestamp' => $timestamp,
            'TransactionType' => 'CustomerPaybillOnline',
            'Amount' => $amount,
            'PartyA' => $phone,
            'PartyB' => config('services.mpesa.shortcode'),
            'PhoneNumber' => $phone,
            'CallBackURL' => config('services.mpesa.callback_url'),
            'AccountReference' => $accountReference,
            'TransactionDesc' => $description,

        ]);

        if ($response->failed()) {
            Log::error('Mpesa STK request failed', ['response' => $response->json()]);

            throw new RuntimeException($response->json('errorMessage', 'Unable to initiate Mpesa payment'));
        }

        $data = $response->json();
        if (($data['ResponseCode'] ?? null) !== '0') {
            throw new RuntimeException($data['ResponseDesccription'] ?? 'Mpesa rejected the STK request');
        }

        return $data;

    }
}
