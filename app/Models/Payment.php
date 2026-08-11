<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    protected $fillable = [
        'order_id', 'method', 'status', 'phone', 'till_code',
        'transaction_code', 'card_number', 'card_expiry', 'card_cvc',
    ];

    protected $hidden = ['card_number', 'card_expiry', 'card_cvc'];


    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }


    public function getMethodLabelAttribute(): string
    {
        return match ($this->method) {
            'mpesa-stk'  => 'M-Pesa STK Push',
            // 'mpesa-till' => 'M-Pesa Till',
            // 'card'       => 'Card',
            default      => $this->method,
        };
    }
}