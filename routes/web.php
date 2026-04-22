<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\OrderController;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;

Route::inertia('/', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');

Route::apiResource('/order', OrderController::class);

Route::middleware(['auth', 'verified'])->group(function () {
    // Route::inertia('dashboard', 'dashboard')->name('dashboard');


    Route::get('/dashboard', [DashboardController::class, 'index'])
        ->name('dashboard');
 
    Route::post('/orders/{order}/cancel', [DashboardController::class, 'updateStatus'])
        ->name('orders.cancel');

});

require __DIR__.'/settings.php';
