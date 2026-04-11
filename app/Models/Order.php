<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    protected $fillable = ['delivery_speed','grand_total'];



    public function orderItems() : HasMany
    {
        return $this->hasMany(OrderItem::class);
    }
    
}
