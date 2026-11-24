<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Subscription extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'phone',
        'email',
        'address',
        'frequency',
        'days',
        'time_slot',
        'sizes',
        'total_per_cycle',
        'payment_method',
        'status',
        'admin_notes',
        'next_delivery_at',
        'last_delivery_at',
    ];

    protected $casts = [
        'days'             => 'array',
        'sizes'            => 'array',
        'total_per_cycle'  => 'integer',
        'next_delivery_at' => 'datetime',
        'last_delivery_at' => 'datetime',
    ];


    /** Null for guest subscribers */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }


    public function scopeGuest($query)
    {
        return $query->whereNull('user_id');
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }


    public function isGuest(): bool
    {
        return $this->user_id === null;
    }
    public function isPending(): bool
    {
        return $this->status === 'pending';
    }
    public function isActive(): bool
    {
        return $this->status === 'active';
    }
    public function isPaused(): bool
    {
        return $this->status === 'paused';
    }
    public function isCancelled(): bool
    {
        return $this->status === 'cancelled';
    }


    public function getFrequencyLabelAttribute(): string
    {
        return match ($this->frequency) {
            'daily'    => 'Daily',
            'weekly'   => 'Weekly',
            'biweekly' => 'Biweekly',
            'monthly'  => 'Monthly',
            default    => $this->frequency,
        };
    }


    public function calculateNextDelivery(): Carbon
    {
        $now = Carbon::now('Africa/Nairobi');

        return match ($this->frequency) {
            'daily'    => $now->copy()->addDay()->setTime(8, 0),
            'weekly'   => $this->nextMatchingDay($now, $this->days ?? [], 1),
            'biweekly' => $this->nextMatchingDay($now, $this->days ?? [], 14),
            'monthly'  => $now->copy()->addMonth()->setTime(8, 0),
            default    => $now->copy()->addDay(),
        };
    }

    private function nextMatchingDay(Carbon $from, array $days, int $minDaysAhead): Carbon
    {
        if (empty($days)) {
            return $from->copy()->addDays(max(1, $minDaysAhead))->setTime(8, 0);
        }

        $candidate = $from->copy()->addDays(max(1, $minDaysAhead));

        for ($i = 0; $i < 14; $i++) {
            if (in_array($candidate->format('l'), $days)) {
                return $candidate->setTime(8, 0);
            }
            $candidate->addDay();
        }

        return $from->copy()->addDays(7)->setTime(8, 0);
    }

   
public static function calculateTotal(array $sizes, $prices = null): int
{
    $prices = $prices ?? Price::all()->keyBy('bottle_size');

    $total = 100;

    foreach ($sizes as $item) {
        $price = $prices->get($item['size']);

        if (!$price) {
            throw new \InvalidArgumentException(
                "Price for {$item['size']} is not configured."
            );
        }

        $unit = $item['type'] === 'refill'
            ? $price->refill_price
            : $price->new_price;

        $total += (float) $unit * (int) $item['quantity'];
    }

    return (int) $total;
}

}
