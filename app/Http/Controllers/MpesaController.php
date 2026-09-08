<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use App\Services\MpesaService;

class MpesaController extends Controller
{
    public $mpesaService;

    public  function  __construct(MpesaService $mpesaService)
    {
        $this->mpesaService = $mpesaService;
    }


    public function accessToken()
    {
        return $this->mpesaService->accessToken();
    }

    public function registerUrls()
    {
        return $this->mpesaService->registerUrls();
    }

    public function stkPush(Request $request)
    {
        $validated = $request->validate([
            'payment_id' => ['required', 'exists:payments,id'],
            'phone'      => ['required', 'regex:/^2547\d{8}$/'], // 2547XXXXXXXX
        ]);

        $payment = Payment::findOrFail($validated['payment_id']);

        $data = $this->mpesaService->stkPush($payment, $validated['phone'], $payment->order->grand_total);

        return response()->json(['checkout_request_id' => $data['CheckoutRequestID'] ?? null]);
    }

    public function stkCallback(Request $request)
    {
        $this->mpesaService->handleStkCallback($request);

        return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Accepted']);
    }

    public function validateURL(Request $request)
    {
        return $this->mpesaService->validateURL($request);
    }

  
}
