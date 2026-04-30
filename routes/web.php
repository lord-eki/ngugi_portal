<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\SubscriptionController;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;

Route::inertia('/', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');

Route::middleware(['auth', 'verified'])->group(function () {

    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // Orders
    Route::post('/orders/{order}/cancel', [DashboardController::class, 'cancel'])->name('orders.cancel');

    // Subscriptions
    Route::post('/subscriptions',                    [SubscriptionController::class, 'store'])->name('subscriptions.store');
    Route::post('/subscriptions/{subscription}/pause',  [SubscriptionController::class, 'pause'])->name('subscriptions.pause');
    Route::post('/subscriptions/{subscription}/resume', [SubscriptionController::class, 'resume'])->name('subscriptions.resume');
    Route::post('/subscriptions/{subscription}/cancel', [SubscriptionController::class, 'cancel'])->name('subscriptions.cancel');

});

require __DIR__.'/settings.php';
