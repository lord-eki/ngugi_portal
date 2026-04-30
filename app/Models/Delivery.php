<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Delivery extends Model
{
    protected $fillable = [
        'order_id', 'location_mode', 'manual_address',
        'pin_address', 'recepient_name', 'recepient_phone',
        'schedule_type', 'scheduled_time', 'notes','contact_phone','contact_name'
    ];


    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }


    public function getAddressAttribute(): string
    {
        return $this->pin_address ?? $this->manual_address ?? '—';
    }

    public function getScheduleLabelAttribute(): string
    {
        return match ($this->schedule_type) {
            'asap'     => 'As soon as possible',
            'later'    => $this->scheduled_time ?? 'Later today',
            'next-day' => $this->scheduled_time ?? 'Next day',
            default    => '—',
        };
    }
}