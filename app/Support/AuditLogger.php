<?php

namespace App\Support;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

class AuditLogger
{

public static function log(string $action, ?Model $subject =  null, array $properties = []):void
{
    AuditLog::create([
        'user_id' => Auth::id(),
        'action' => $action,
        'auditable_type' => $subject ? get_class($subject) : null,
        'auditable_id' => $subject?->getKey(),
        'properties' => $properties,
        'ip_address' => request()?->ip()

    ]);
}

}
