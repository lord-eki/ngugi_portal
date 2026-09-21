<?php
namespace App\Actions\Orders;

use App\Models\Order;
use App\Models\Refiller;
use Illuminate\Http\RedirectResponse;

class AssignRefillerAction
{
    public function handle(Order $order, ?int $refillerId): RedirectResponse
    {
        if ($refillerId !== null) {
            Refiller::where('id', $refillerId)->where('is_active', true)->firstOrFail();
        }

        $order->update(['refiller_id' => $refillerId]);

        return back();
    }
}