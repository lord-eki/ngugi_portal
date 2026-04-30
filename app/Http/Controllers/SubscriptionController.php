<?php

namespace App\Http\Controllers;

use App\Models\Subscription;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class SubscriptionController extends Controller
{

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name'             => ['required', 'string', 'max:100'],
            'phone'            => ['required', 'string', 'min:9', 'max:12'],
            'email'            => ['nullable', 'email', 'max:150'],
            'address'          => ['nullable', 'string', 'max:255'],
            'frequency'        => ['required', 'in:daily,weekly,biweekly,monthly'],
            'days'             => ['nullable', 'array'],
            'days.*'           => ['string', 'in:Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday'],
            'time_slot'        => ['required', 'string'],
            'sizes'            => ['required', 'array', 'min:1'],
            'sizes.*.size'     => ['required', 'string'],
            'sizes.*.quantity' => ['required', 'integer', 'min:1'],
            'sizes.*.type'     => ['required', 'in:refill,new'],
            'payment_method'   => ['required', 'in:mpesa-stk,card'],
        ]);

        $userId = Auth::id(); 

        $sizesWithAmounts = array_map(function ($item) {
            $prices = [
                '500ml' => ['refill' => 15,  'new' => 30],
                '1L'    => ['refill' => 25,  'new' => 50],
                '5L'    => ['refill' => 80,  'new' => 150],
                '10L'   => ['refill' => 120, 'new' => 250],
                '15L'   => ['refill' => 160, 'new' => 350],
                '20L'   => ['refill' => 200, 'new' => 450],
            ];
            $unit = $prices[$item['size']][$item['type']] ?? 0;
            return array_merge($item, ['amount' => $unit * $item['quantity']]);
        }, $data['sizes']);

        $total = Subscription::calculateTotal($data['sizes']);

        $subscription = Subscription::create([
            'user_id'         => $userId,
            'name'            => $data['name'],
            'phone'           => $data['phone'],
            'email'           => $data['email'] ?? null,
            'address'         => $data['address'] ?? null,
            'frequency'       => $data['frequency'],
            'days'            => $data['days'] ?? [],
            'time_slot'       => $data['time_slot'],
            'sizes'           => $sizesWithAmounts,
            'total_per_cycle' => $total,
            'payment_method'  => $data['payment_method'],
            'status'          => 'pending',
        ]);

        $subscription->update([
            'next_delivery_at' => $subscription->calculateNextDelivery(),
        ]);

        // TODO: EMAIL confirmation

        return back()->with('subscription_created', true);
    }

 
    public function pause(Subscription $subscription): RedirectResponse
    {
        abort_if(! Auth::check(), 403);
        abort_if(! $subscription->isActive(), 422);

        $subscription->update(['status' => 'paused']);

        return back()->with('success', 'Subscription paused.');
    }

   
    public function resume(Subscription $subscription): RedirectResponse
    {
        abort_if(! Auth::check(), 403);
        abort_if(! $subscription->isPaused(), 422);

        $subscription->update([
            'status'           => 'active',
            'next_delivery_at' => $subscription->calculateNextDelivery(),
        ]);

        return back()->with('success', 'Subscription resumed.');
    }

    
    public function cancel(Subscription $subscription): RedirectResponse
    {
        abort_if(! Auth::check(), 403);
        abort_if($subscription->isCancelled(), 422);

        $subscription->update(['status' => 'cancelled']);

        return back()->with('success', 'Subscription cancelled.');
    }
}