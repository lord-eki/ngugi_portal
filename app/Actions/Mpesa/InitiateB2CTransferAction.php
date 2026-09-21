<?php

namespace App\Actions\Mpesa;

use Iankumu\Mpesa\Facades\Mpesa;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class InitiateB2CTransferAction
{
    public function handle(string $phone, int $amount, string $remarks, string $occasion): array
    {
        $response = Mpesa::b2c($phone, $amount, 'BusinessPayment', $remarks, $occasion);
        $data = $response->json();

        if ($response->failed() || ($data['ResponseCode'] ?? null) !== '0') {
            Log::error('Mpesa B2C request failed', ['response' => $data]);
            throw new RuntimeException($data['errorMessage'] ?? 'Unable to initiate B2C transfer');
        }

        return $data;
    }
}