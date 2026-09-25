<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Refiller;
use App\Support\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RefillerController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/refillers/index', [
            'refillers' => Refiller::latest()->get(['id', 'name', 'phone', 'commission_percentage', 'is_active']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name'  => ['required', 'string', 'max:255'],
            'phone' => ['required', 'regex:/^2547\d{8}$/'],
            'commission_percentage' => ['required', 'numeric', 'min:0', 'max:100'],
        ]);

        $refiller = Refiller::create($validated + ['is_active' => true]);

        AuditLogger::log('refiller.created', $refiller, $validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Refiller added.']);
        return back();
    }

    public function toggleStatus(Refiller $refiller): RedirectResponse
    {
        $refiller->update(['is_active' => ! $refiller->is_active]);
        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $refiller->is_active ? "{$refiller->name} reactivated." : "{$refiller->name} deactivated.",
        ]);

        AuditLogger::log($refiller->is_active ? 'refiller.activated' : 'refiller.deactivated', $refiller);

        return back();
    }

    public function update(Refiller $refiller, Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'phone' => ['required', 'regex:/^2547\d{8}$/'],
            'commission_percentage' => ['required', 'numeric', 'min:0', 'max:100'],
        ]);

        $refiller->update($validated);

        AuditLogger::log('refiller.updated', $refiller, $validated);


        Inertia::flash('toast', ['type' => 'success', 'message' => "{$refiller->name}'s details updated."]);
        return back();
    }
}
