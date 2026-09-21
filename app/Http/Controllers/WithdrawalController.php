<?php

namespace App\Http\Controllers;

use App\Actions\Riders\RequestWithdrawalAction;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use RuntimeException;

class WithdrawalController extends Controller
{
    public function store(Request $request, RequestWithdrawalAction $action): RedirectResponse
    {
        $data = $request->validate(['amount' => ['required', 'integer', 'min:10']]);

        try {
            $action->handle(Auth::user(), $data['amount']);

            return back()->with('success', 'Withdrawal initiated — funds should arrive shortly.');
        } catch (RuntimeException $e) {
            return back()->withErrors(['amount' => $e->getMessage()]);
        }
    }
}