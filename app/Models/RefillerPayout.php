<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RefillerPayout extends Model
{
    protected $fillable = [
        'refiller_id', 'order_id', 'percentage', 'amount', 'phone', 'status',
        'originator_conversation_id', 'conversation_id', 'mpesa_receipt', 'result_description',
    ];

    public function refiller(): BelongsTo
    {
        return $this->belongsTo(Refiller::class);
    }
}