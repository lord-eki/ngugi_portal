<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Subscription;
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
                'status'         => $order->status ?? 'pending',
                'status_label'   => $order->status_label,
                'grand_total'    => (int) $order->grand_total,
                'can_cancel'     => $order->canBeCancelled(),
                'created_at'     => $order->created_at->toISOString(),

                'items' => $order->orderItems->map(fn ($item) => [
                    'id'              => $item->id,
                    'type'            => $item->type,
                    'size'            => $item->size,
                    'quantity'        => (int) $item->quantity,
                    'is_bundled'      => (bool) $item->is_bundled,
                    'bundle_quantity' => $item->bundle_quantity ? (int) $item->bundle_quantity : null,
                    'bundle_size'     => $item->bundle_size ? (int) $item->bundle_size : null,
                    'amount'          => (int) $item->amount,
                    'label'           => $item->label,
                ]),

                'charges' => $order->charges->map(fn ($c) => [
                    'id'     => $c->id,
                    'label'  => $c->label,
                    'amount' => (int) $c->amount,
                ]),

                'delivery' => $order->delivery ? [
                    'location_mode'  => $order->delivery->location_mode,
                    'address'        => $order->delivery->address,          
                    'contact_name'   => $order->delivery->contact_name ?? null,
                    'contact_phone'  => $order->delivery->contact_phone ?? null,
                    'recepient_name'  => $order->delivery->recepient_name,
                    'recepient_phone' => $order->delivery->recepient_phone,
                    'schedule_label' => $order->delivery->schedule_label,   
                    'notes'          => $order->delivery->notes,
                ] : null,

                'payment' => $order->payment ? [
                    'method'           => $order->payment->method,
                    'method_label'     => $order->payment->method_label,
                    'status'           => $order->payment->status ?? 'pending',
                    'phone'            => $order->payment->phone,
                    'transaction_code' => $order->payment->transaction_code,
                ] : null,
            ]);

        $subscriptions = Subscription::whereIn('status', ['active', 'paused'])
            ->latest()
            ->get()
            ->map(fn (Subscription $sub) => [
                'id'               => $sub->id,
                'frequency'        => $sub->frequency,
                'frequency_label'  => $sub->frequency_label,
                'status'           => $sub->status,
                'next_delivery_at' => $sub->next_delivery_at?->toISOString(),
                'sizes'            => $sub->sizes,
                'total_per_cycle'  => $sub->total_per_cycle,
                'created_at'       => $sub->created_at->toISOString(),
            ]);

        return Inertia::render('dashboard', [
            'stats'         => $stats,
            'orders'        => $orders,
            'subscriptions' => $subscriptions,
        ]);
    }

    public function cancel(Order $order): \Illuminate\Http\RedirectResponse
    {
        abort_if($order->user_id !== Auth::id(), 403);

        if (! $order->canBeCancelled()) {
            return back()->withErrors(['order' => 'This order cannot be cancelled.']);
        }

        $order->update(['status' => 'cancelled']);

        return back()->with('success', 'Order cancelled.');
    }
}