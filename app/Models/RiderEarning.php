<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RiderEarning extends Model
{
    protected $fillable = ['rider_id', 'order_id', 'percentage', 'amount', 'status'];

    public function rider(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rider_id');
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}