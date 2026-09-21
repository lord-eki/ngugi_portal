<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Withdrawal extends Model
{
    protected $fillable = [
        'rider_id', 'amount', 'phone', 'status',
        'originator_conversation_id', 'conversation_id',
        'mpesa_receipt', 'result_description',
    ];

    public function rider(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rider_id');
    }

    public function earnings(): HasMany
    {
        return $this->hasMany(RiderEarning::class);
    }
}