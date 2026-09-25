<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Illuminate\Http\RedirectResponse;

class RiderAvailabilityController extends Controller
{
    public function toggle(): RedirectResponse
    {
        $rider = Auth::user();
        abort_unless($rider->isRider(),403);

        $goingOnline = ! $rider->is_online;

        $rider->update([
            'is_online' => $goingOnline,
            'last_online_at' => $goingOnline ? now() : $rider->last_online_at,
        ]);

        Inertia::flash('toast',[
            'type' => 'success',
            'message' => $goingOnline ? "You're online -  you can now receive deliveries." : "You're offline."
        ]);

        return back();
    }
}
