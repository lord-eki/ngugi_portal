<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Refiller extends Model
{
    protected $fillable = ['name', 'phone', 'commission_percentage', 'is_active'];

    public function payouts(): HasMany
    {
        return $this->hasMany(RefillerPayout::class);
    }
}