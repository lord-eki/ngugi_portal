<?php

namespace App\Services;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class MpesaService
{
   

    

    public function accessToken(): string
    {
        $baseUrl = config('services.mpesa.base_url');

        $response = Http::withBasicAuth(config('services.mpesa.consumer_key'), config('services.mpesa.consumer_secret'))->get($baseUrl . '/oauth/v1/generate?grant_type=client_credentials');

        if ($response->failed()) {
            Log::error('Mpesa OAuth failed', ['response' => $response->json()]);

            throw new RuntimeException('Unable to authenticate with Mpesa');
        }

        return $response->json('access_token');
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


    public function c2b($amount,$msisdn ,$billrefnumber)
    {
        $response = Http::withToken($this->accessToken())->post(config('services.mpesa.base_url') . '/mpesa/c2b/v2/simulate', [
            'ShortCode' => config('services.mpesa.shortcode'),
            'CommandID' => 'CustomerBuyGoodsOnline',
            'Amount' => $amount,
            'Msisdn' => $msisdn,
            'BillRefNumber' => $billrefnumber,
        ]);

        if ($response->failed()) {
            Log::error('Mpesa C2B simulation failed', ['response' => $response->json()]);

            throw new RuntimeException($response->json('errorMessage', 'Unable to simulate Mpesa C2B payment'));
        }

        return $response->json();
    }

    public function validateURL(Request $request)
    {
        Log::info('M-Pesa Validation:', $request->all());

        return response()->json([
            "ResultCode" => "0",
            "ResultDesc" => "Accepted"
        ]);
    }

    public function confirmURL(Request $request)
    {
        Log::info('M-Pesa Confirmation:', $request->all());

        //STORE IN THE DB
    }

  
}
