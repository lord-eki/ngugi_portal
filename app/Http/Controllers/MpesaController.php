<?php

namespace App\Http\Controllers;

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

    public function validateURL(Request $request)
    {
       return $this->mpesaService->validateURL($request);
    }

    public function confirmURL(Request $request)
    {
        return $this->mpesaService->confirmURL($request);
    }
}
