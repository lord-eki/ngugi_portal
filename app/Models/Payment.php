<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    protected $fillable = [
        'order_id','method','phone','till_code','transaction_code',
        'card_number','card_expiry','card_cvc'
    ];
}
