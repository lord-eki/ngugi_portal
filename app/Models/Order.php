<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Order extends Model
{
    protected $fillable = [
        'user_id',
        'delivery_speed',
        'status',
        'grand_total',
    ];


    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function charges(): HasMany
    {
        return $this->hasMany(OrderCharge::class);
    }

    public function delivery(): HasOne
    {
        return $this->hasOne(Delivery::class);
    }

    public function payment(): HasOne
    {
        return $this->hasOne(Payment::class);
    }

    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'pending'          => 'Pending',
            'confirmed'        => 'Confirmed',
            'out_for_delivery' => 'Out for delivery',
            'delivered'        => 'Delivered',
            'cancelled'        => 'Cancelled',
            default            => 'Unknown',
        };
    }

    public function canBeCancelled(): bool
    {
        return in_array($this->status, ['pending', 'confirmed']);
    }
}