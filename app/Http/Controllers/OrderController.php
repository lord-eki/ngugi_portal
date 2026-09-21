<?php

namespace App\Http\Controllers;

use App\Actions\Orders\AssignRiderAction;
use App\Actions\Orders\CancelOrderAction;
use App\Actions\Orders\CreateOrderAction;
use App\Actions\Orders\PaymentStatusAction;
use App\Actions\Orders\UpdateOrderStatus;
use App\Actions\Orders\VerifyPaymentAction;
use App\Mail\DeliveryCodeMail;
use App\Models\Order;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;

class OrderController extends Controller
{

    public function store(Request $request, CreateOrderAction $createOrderAction)

    {
        Log::info($request);
        return $createOrderAction->handle($request->all());
    }

    public function updateOrderStatus(Order $order, Request $request, UpdateOrderStatus $action): RedirectResponse
    {
        return $action->handle($request, $order);
    }

    public function cancel(Order $order, CancelOrderAction $action): RedirectResponse
    {
        return $action->handle($order);
    }

    public function verifyPayment(Order $order, VerifyPaymentAction $action): RedirectResponse
    {

        return $action->handle($order);
    }

    public function paymentStatus(Order $order, PaymentStatusAction $action)
    {
        return $action->handle($order);
    }

    public function assignRider(Order $order, Request $request, AssignRiderAction $action): RedirectResponse
    {
        $data = $request->validate(['rider_id' => ['nullable', 'exists:users,id']]);

        return $action->handle($order, $data['rider_id'] ?? null);
    }

    public function resendDeliveryCode(Order $order): RedirectResponse
    {
        abort_unless(Auth::user()->isAdmin(), 403);

        $order->loadMissing('delivery');
        abort_if(! $order->delivery?->delivery_code, 422, 'No delivery code has been generated for this order yet.');

        $email = $order->delivery->recepient_email ?? $order->delivery->contact_email;
        abort_if(! $email, 422, 'No email on file for this order — share the code manually.');

        Mail::to($email)->queue(new DeliveryCodeMail($order, $order->delivery->delivery_code));

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Delivery code re-sent.']);
        return back();
    }
}
