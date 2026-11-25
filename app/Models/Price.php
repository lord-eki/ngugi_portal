<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Override;

class Price extends Model
{
    

    protected $fillable = ['user_id','bottle_size','refill_price','new_price',
    'has_bundle','is_active','bundle_options','sort_order'
    ];

    protected $casts = [
        'bundle_options' => 'array',
        'has_bundle' => 'boolean',
        'is_active' => 'boolean'
    ];


#[Override]
	protected static function booted()
    {
        static::creating(function(Price $price){
            $price->user_id = Auth::id();
        });
    }

}
