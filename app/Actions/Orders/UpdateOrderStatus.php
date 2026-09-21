<?php

namespace App\Actions\Orders;

use App\Actions\Mpesa\InitiateB2CTransferAction;
use App\Actions\Refillers\PayRefillerForOrderAction;
use App\Actions\Riders\RecordRiderEarningAction;
use App\Mail\DeliveryCodeMail;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class UpdateOrderStatus
{
    private const RIDER_TRANSITIONS = [
        'confirmed'        => ['out_for_delivery'],
        'out_for_delivery' => ['delivered'],
    ];

    public function handle(Request $request, Order $order)
    {
        $user = Auth::user();
        abort_if(! $user, 403);

        $data = $request->validate([
            'status' => ['required', 'in:confirmed,out_for_delivery,delivered,cancelled'],
        ]);


        if ($user->isRider()) {
            abort_if(! $user->is_active, 403, 'Your account has been suspended.');

            $order->loadMissing('delivery');
            abort_if($order->delivery?->rider_id !== $user->id, 403, 'This order is not assigned to you.');

            $allowed = self::RIDER_TRANSITIONS[$order->status] ?? [];
            abort_unless(in_array($data['status'], $allowed, true), 403, "You can't make that status change.");

            if ($data['status'] === 'delivered') {
                $submittedCode = $request->validate(['delivery_code' => ['required', 'string']])['delivery_code'];

                abort_unless(
                    $order->delivery && $submittedCode === $order->delivery->delivery_code,
                    422,
                    'Incorrect delivery code.'
                );

                $order->delivery->update(['delivery_code_verified_at' => now()]);

                if ($data['status'] === 'delivered') {
                    app(RecordRiderEarningAction::class)->handle($order);
                    app(PayRefillerForOrderAction::class)
                        ->handle($order, app(InitiateB2CTransferAction::class));
                }
            }
        } else {
            abort_unless($user->isAdmin(), 403);

            if ($data['status'] === 'out_for_delivery') {
                $order->loadMissing('delivery');
                abort_if(
                    ! $order->delivery?->rider_id,
                    422,
                    'Assign a rider to this order before marking it out for delivery.'
                );
            }
        }

        $order->update(['status' => $data['status']]);

        if ($data['status'] === 'out_for_delivery' && ! $order->delivery?->delivery_code) {
            $code = (string) random_int(1000, 9999);
            $order->delivery->update(['delivery_code' => $code]);

            $email = $order->delivery->recepient_email ?? $order->delivery->contact_email;

            if ($email) {
                Mail::to($email)->queue(new DeliveryCodeMail($order, $code));
            } else {
                Log::warning('No email on file to send delivery code', ['order_id' => $order->id]);
            }
        }

        return back()->with('success', 'Order status updated.');
    }
}
