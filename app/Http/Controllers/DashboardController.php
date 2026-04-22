<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        $userId = Auth::id();

        $stats = [
            'totalOrders'    => Order::count(),
            'totalSpent'     => Order::whereIn('status', ['confirmed', 'out_for_delivery', 'delivered'])
                                    ->sum('grand_total'),
            'activeOrders'   => Order::whereIn('status', ['pending', 'confirmed', 'out_for_delivery'])
                                    ->count(),
            'deliveredCount' => Order::where('status', 'delivered')
                                    ->count(),
        ];

        $orders = Order::with(['orderItems', 'charges', 'delivery', 'payment'])
            ->latest()
            ->paginate(10)
            ->through(fn (Order $order) => [
                'id'             => $order->id,
                'delivery_speed' => $order->delivery_speed,
                'status'         => $order->status,
                'status_label'   => $order->status_label,
                'grand_total'    => $order->grand_total,
                'can_cancel'     => $order->canBeCancelled(),
                'created_at'     => $order->created_at->toISOString(),

                'items' => $order->orderItems->map(fn ($item) => [
                    'id'              => $item->id,
                    'type'            => $item->type,
                    'size'            => $item->size,
                    'quantity'        => $item->quantity,
                    'is_bundled'      => $item->is_bundled,
                    'bundle_quantity' => $item->bundle_quantity,
                    'bundle_size'     => $item->bundle_size,
                    'amount'          => $item->amount,
                    'label'           => $item->label,  // computed accessor
                ]),

                'charges' => $order->charges->map(fn ($charge) => [
                    'id'     => $charge->id,
                    'label'  => $charge->label,
                    'amount' => $charge->amount,
                ]),

                'delivery' => $order->delivery ? [
                    'location_mode'   => $order->delivery->location_mode,
                    'address'         => $order->delivery->address,   
                    'recepient_name'  => $order->delivery->recepient_name,
                    'recepient_phone' => $order->delivery->recepient_phone,
                    'schedule_label'  => $order->delivery->schedule_label,
                    'notes'           => $order->delivery->notes,
                ] : null,

                'payment' => $order->payment ? [
                    'method'           => $order->payment->method,
                    'method_label'     => $order->payment->method_label,
                    'status'           => $order->payment->status ?? 'pending',
                    'phone'            => $order->payment->phone,
                    'transaction_code' => $order->payment->transaction_code,
                ] : null,
            ]);

        return Inertia::render('dashboard', [
            'stats'  => $stats,
            'orders' => $orders,
        ]);
    }

    public function cancel(Order $order): \Illuminate\Http\RedirectResponse
    {

        if (! $order->canBeCancelled()) {
            return back()->withErrors(['order' => 'This order cannot be cancelled.']);
        }

        $order->update(['status' => 'cancelled']);

        return back()->with('success', 'Order cancelled.');
    }
}