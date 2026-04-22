<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderItem extends Model
{
    protected $fillable = [
        'order_id', 'type', 'size', 'quantity',
        'is_bundled', 'bundle_quantity', 'bundle_size', 'amount',
    ];

    protected $casts = [
        'is_bundled'      => 'boolean',
        'quantity'        => 'integer',
        'bundle_quantity' => 'integer',
        'bundle_size'     => 'integer',
        'amount'          => 'integer',
    ];


    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }


    public function getLabelAttribute(): string
    {
        if ($this->is_bundled) {
            return "New {$this->size} bundle ×{$this->bundle_quantity} (pack of {$this->bundle_size})";
        }
        $prefix = $this->type === 'refill' ? 'Refill' : 'New';
        return "{$prefix} {$this->size} ×{$this->quantity}";
    }
}