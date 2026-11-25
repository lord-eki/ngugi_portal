<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;
use Override;

class Checkout extends Model
{
    protected $fillable = [
        'public_id',
        'idempotency_key',
        'payload',
        'amount',
        'merchant_request_id',
        'phone',
        'checkout_request_id',
        'mpesa_receipt_number',
        'status',
        'failure_reason',
        'order_id',
        'expires_at'
    ];

    protected $casts = [
        'payload' => 'array',
        'amount' => 'integer',
        'expires_at' => 'datetime'
    ];

    protected static function booted(): void
    {
        static::creating(fn(Checkout $c) => $c->public_id ??= (string) Str::uuid());
    }

    #[Override]
    public function getRouteKeyName(): string
    {
        return 'public_id';
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
