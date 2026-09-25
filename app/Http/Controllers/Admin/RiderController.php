<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Riders\CreateRiderAction;
use App\Actions\Riders\ResetRiderPasswordAction;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use App\Models\Delivery;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class RiderController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/riders/index', [
            'riders' => User::where('role', 'rider')
                ->latest()
                ->get(['id', 'name', 'email', 'phone', 'commission_percentage','email_verified_at',
                 'is_active', 'created_at','national_id','payout_method','transport_type','is_online']),
        ]);
    }

    public function store(Request $request, CreateRiderAction $action): RedirectResponse
    {
        $validated = $request->validate([
            'name'  => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'phone' => ['required', 'regex:/^2547\d{8}$/'],
            'commission_percentage' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'national_id' => ['required','string','max:20'],
            'payout_method' => ['required','in:mpesa,airtel,bank'],
            'transport_type' => ['required','in:walking,bicycle,bike']
        ]);

        $rider = $action->handle($validated);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "Rider {$rider->name} created — login details have been emailed to {$rider->email}.",
        ]);

        return back();
    }

    public function update(User $rider, Request $request): RedirectResponse
    {
        abort_unless($rider->isRider(), 404);

        $validated = $request->validate([
            'phone' => ['required', 'regex:/^2547\d{8}$/'],
            'commission_percentage' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'payout_method' => ['required','in:mpesa,airtel,bank'],
            'transport_type' => ['required','in:walking,bicycle,bike']
        ]);

        $rider->update($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$rider->name}'s details updated."]);

        return back();
    }

    public function toggleStatus(User $rider): RedirectResponse
    {
        abort_unless($rider->isRider(), 404);

        $activating = ! $rider->is_active;

        DB::transaction(function () use ($rider, $activating) {
            $rider->update(['is_active' => $activating]);

            if (! $activating) {

                $rider->update(['is_online' => false]);

                Delivery::where('rider_id', $rider->id)
                    ->whereHas('order', fn($q) => $q->whereNotIn('status', ['delivered', 'cancelled']))
                    ->update(['rider_id' => null, 'assigned_at' => null]);
            }
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $activating
                ? "{$rider->name} reactivated."
                : "{$rider->name} suspended — their active orders were unassigned so you can reassign them.",
        ]);

        return back();
    }

    public function resetPassword(User $rider, ResetRiderPasswordAction $action): RedirectResponse
    {
        abort_unless($rider->isRider(), 404);

        $action->handle($rider);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "New password generated and emailed to {$rider->email}.",
        ]);

        return back();
    }

    public function revealPassword(User $rider): JsonResponse
    {
        abort_unless($rider->isRider(), 404);
        abort_if(! $rider->password_encrypted, 404);

        return response()->json(['password' => Crypt::decryptString($rider->password_encrypted)]);
    }
}
