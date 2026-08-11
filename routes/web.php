<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\SubscriptionController;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;

Route::inertia('/', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');

Route::resource('orders', OrderController::class);

Route::middleware(['auth', 'verified'])->group(function () {

    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    Route::post('/orders/{order}/status', [OrderController::class, 'updateOrderStatus'])
        ->name('orders.status');

    Route::post('/orders/{order}/verify-payment', [OrderController::class, 'verifyPayment'])
        ->name('orders.verify-payment');

    Route::post('/orders/{order}/cancel', [OrderController::class, 'cancel'])
        ->name('orders.cancel');

    Route::post('/subscriptions', [SubscriptionController::class, 'store'])->name('subscriptions.store');
    Route::post('/subscriptions/{subscription}/pause', [SubscriptionController::class, 'pause'])->name('subscriptions.pause');
    Route::post('/subscriptions/{subscription}/resume', [SubscriptionController::class, 'resume'])->name('subscriptions.resume');
    Route::post('/subscriptions/{subscription}/activate', [SubscriptionController::class, 'activate'])->name('subscriptions.activate');
    Route::post('/subscriptions/{subscription}/cancel', [SubscriptionController::class, 'cancel'])->name('subscriptions.cancel');

});

require __DIR__.'/settings.php';
