<?php

namespace App\Http\Controllers\Rider;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\RiderEarning;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        $riderId = Auth::id();

        $earningsQuery = RiderEarning::where('rider_id', $riderId);


        $scope = fn($q) => $q->where('rider_id', $riderId);

        $stats = [
            'outForDelivery' => Order::whereHas('delivery', $scope)->where('status', 'out_for_delivery')->count(),
            'deliveredToday' => Order::whereHas('delivery', $scope)->where('status', 'delivered')->whereDate('updated_at', today())->count(),
            'assignedTotal'  => Order::whereHas('delivery', $scope)->count(),
            'totalEarned'      => (clone $earningsQuery)->sum('amount'),
            'availableBalance' => (clone $earningsQuery)->where('status', 'available')->sum('amount'),
        ];

        $recentEarnings = RiderEarning::where('rider_id', $riderId)
            ->latest()
            ->limit(10)
            ->get(['id', 'order_id', 'amount', 'percentage', 'created_at']);


        $orders = Order::whereHas('delivery', $scope)
            ->with(['delivery'])
            ->latest()
            ->paginate(10)
            ->through(fn(Order $order) => [
                'id'             => $order->id,
                'delivery_speed' => $order->delivery_speed,
                'status'         => $order->status,
                'status_label'   => $order->status_label,
                'grand_total'    => (int) $order->grand_total,
                'created_at'     => $order->created_at->toISOString(),
                'items'          => $order->orderItems->map(fn($i) => [
                    'id' => $i->id,
                    'type' => $i->type,
                    'size' => $i->size,
                    'quantity' => (int) $i->quantity,
                    'is_bundled' => (bool) $i->is_bundled,
                    'bundle_quantity' => $i->bundle_quantity,
                    'bundle_size' => $i->bundle_size,
                    'amount' => (int) $i->amount,
                    'label' => $i->label,
                ]),
                'charges' => $order->charges->map(fn($c) => ['id' => $c->id, 'label' => $c->label, 'amount' => (int) $c->amount]),
                'delivery' => $order->delivery ? [
                    'location_mode'  => $order->delivery->location_mode,
                    'address'        => $order->delivery->address,
                    'contact_name'   => $order->delivery->contact_name,
                    'contact_phone'  => $order->delivery->contact_phone,
                    'recepient_name' => $order->delivery->recepient_name,
                    'recepient_phone' => $order->delivery->recepient_phone,
                    'schedule_label' => $order->delivery->schedule_label,
                    'notes'          => $order->delivery->notes,
                ] : null,
                'payment' => $order->payment ? [
                    'method' => $order->payment->method,
                    'method_label' => $order->payment->method_label,
                    'status' => $order->payment->status,
                    'phone' => $order->payment->phone,
                    'transaction_code' => $order->payment->transaction_code,
                ] : null,
            ]);

        return Inertia::render(
            'rider/dashboard',
            [
                'stats' => $stats,
                'orders' => $orders,
                'recentEarnings' => $recentEarnings,
                'emailVerified' => (bool) Auth::user()->email_verified_at,
                'isOnline' => (bool) Auth::user()->is_online,
            ]
        );
    }
}
