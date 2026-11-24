<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreSubscriptionRequest;
use App\Models\Price;
use App\Models\Subscription;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class SubscriptionController extends Controller
{

    public function store(StoreSubscriptionRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $prices = Price::all()->keyBy('bottle_size');

        $sizesWithAmounts = array_map(function ($item) use ($prices) {
            $price = $prices->get($item['size']);

            if (!$price) {
                throw ValidationException::withMessages([
                    'sizes' => "Price for {$item['size']} is not configured.",
                ]);
            }

            $unit = $item['type'] === 'refill'
                ? $price->refill_price
                : $price->new_price;

            return array_merge($item, [
                'amount' => (float) $unit * (int) $item['quantity'],
            ]);
        }, $data['sizes']);

        $total = Subscription::calculateTotal($data['sizes'], $prices);

        $subscription = Subscription::create([
            'user_id'         => Auth::id(),
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

        return back()->with(
            'success',
            'Your subscription has been submitted successfully! We will contact you shortly to confirm your delivery.'
        );
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



    public function activate(Subscription $subscription): RedirectResponse
    {
        abort_if(! Auth::check(), 403);
        abort_if($subscription->status !== 'pending', 422);

        $subscription->update([
            'status'           => 'active',
            'next_delivery_at' => $subscription->calculateNextDelivery(),
        ]);

        return back()->with('success', 'Subscription activated.');
    }


    public function cancel(Subscription $subscription): RedirectResponse
    {
        abort_if(! Auth::check(), 403);
        abort_if($subscription->isCancelled(), 422);

        $subscription->update(['status' => 'cancelled']);

        return back()->with('success', 'Subscription cancelled.');
    }
}
