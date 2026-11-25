<?php

use App\Models\Checkout;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::call(function () {
    Checkout::where('status', 'pending')->where('expires_at', '<', now())->update([
        'status'         => 'expired',
        'failure_reason' => 'The payment timed out. If money was deducted, contact us with your M-Pesa message.',
    ]);
})->everyMinute()->name('expire-checkouts');