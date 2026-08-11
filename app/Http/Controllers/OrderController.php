<?php

namespace App\Http\Controllers;

use App\Actions\Orders\CancelOrderAction;
use App\Actions\Orders\CreateOrderAction;
use App\Actions\Orders\UpdateOrderStatus;
use App\Actions\Orders\VerifyPaymentAction;
use App\Http\Requests\StoreOrderRequest;
use App\Http\Requests\UpdateOrderRequest;
use App\Models\Order;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class OrderController extends Controller
{

    public function store(Request $request , CreateOrderAction $createOrderAction)
    
    {
        Log::info($request);
        return $createOrderAction->handle($request->all());

    }

     public function updateOrderStatus(Order $order, Request $request , UpdateOrderStatus $action): RedirectResponse
    {
        return $action->handle($request,$order);
    }

    public function cancel(Order $order , CancelOrderAction $action): RedirectResponse
    {
        return $action->handle($order);
        
    }

    public function verifyPayment(Order $order , VerifyPaymentAction $action): RedirectResponse
    {

    return $action->handle($order);
       
    }

   
}
