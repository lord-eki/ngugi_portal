<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    use HasFactory;
    
    protected $fillable = [
        'order_id', 'method', 'phone', 'till_code',
        'status','checkout_request_id','merchant_request_id','mpesa_receipt_number',
        'result_code','result_description'
    ];

    protected $casts = [
        'result_code' => 'integer'
    ];



    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }


    public function getMethodLabelAttribute(): string
    {
        return match ($this->method) {
            'mpesa-stk'  => 'M-Pesa STK Push',
            'mpesa-till' => 'M-Pesa Till',
            default      => $this->method,
        };
    }
}