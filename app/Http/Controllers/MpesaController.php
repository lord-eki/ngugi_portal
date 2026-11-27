<?php

namespace App\Http\Controllers;

use App\Actions\Riders\HandleB2CResultAction;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use App\Services\MpesaService;

class MpesaController extends Controller
{
    public MpesaService $mpesaService;

    public  function  __construct(MpesaService $mpesaService)
    {
        $this->mpesaService = $mpesaService;
    }


    public function accessToken()
    {
        return $this->mpesaService->accessToken();
    }

  
    public function stkCallback(Request $request)
    {
        $this->mpesaService->handleStkCallback($request);

        return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Accepted']);
    }


}
