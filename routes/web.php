<?php

use App\Http\Controllers\Admin\RiderController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\SubscriptionController;
use App\Http\Controllers\MpesaController;
use App\Http\Controllers\Rider\DashboardController as RiderDashboardController;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;

Route::inertia('/', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');

Route::resource('orders', OrderController::class);

Route::get('/orders/{order}/payment-status', [OrderController::class, 'paymentStatus'])
    ->name('orders.payment-status');

Route::post('/mpesa/register-urls', [MpesaController::class, 'registerUrls']);
Route::post('/mpesa/stk', [MpesaController::class, 'stkPush']);
Route::post('/mpesa/validate', [MpesaController::class, 'validateURL']);
Route::post('/mpesa/stk/callback', [MpesaController::class, 'stkCallback']);

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

    Route::middleware('role:admin')->prefix('admin')->name('admin.')->group(function () {
        Route::get('/riders', [RiderController::class, 'index'])->name('riders.index');
        Route::post('/riders', [RiderController::class, 'store'])->name('riders.store');
    });

    Route::middleware('role:rider')->prefix('rider')->name('rider.')->group(function () {
        Route::get('/dashboard', [RiderDashboardController::class, 'index'])->name('dashboard');
    });
});

require __DIR__ . '/settings.php';
