<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Riders\CreateRiderAction;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RiderController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/riders/index', [
            'riders' => User::where('role', 'rider')
                ->latest()
                ->get(['id', 'name', 'email', 'phone', 'created_at']),
        ]);
    }

    public function store(Request $request, CreateRiderAction $action): RedirectResponse
    {
        $validated = $request->validate([
            'name'  => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'phone' => ['required', 'regex:/^2547\d{8}$/'],
        ]);

        $result = $action->handle($validated);

        return back()->with('rider_created', [
            'name'     => $result['rider']->name,
            'email'    => $result['rider']->email,
            'password' => $result['temporary_password'],
        ]);
    }
}