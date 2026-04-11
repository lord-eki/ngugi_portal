<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Delivery extends Model
{
    protected $fillable = [
        'order_id' ,'location_mode','manual_address',
        'pin_address','recepient_name','recepient_phone',
        'schedule_type','scheduled_time','notes'
    ];
}
