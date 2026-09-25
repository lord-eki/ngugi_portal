<?php

namespace App\Http\Controllers\Rider;

use App\Http\Controllers\Controller;
use App\Mail\RiderVerificationMail;
use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;

class RiderEmailVerificationController extends Controller
{


    public function verify(int $id, string $hash)
    {
        $rider = User::where('id', $id)->where('role', 'rider')->firstOrFail();

        abort_unless(hash_equals(sha1($rider->email), $hash), 403);

        if (! $rider->email_verified_at) {
            $rider->forceFill(['email_verified_at' => now()])->save();
        }

        return redirect()->route('login')->with('status','Email verified - you can now log in');
    }

    public function resend(): RedirectResponse
    {
        $rider = Auth::user();

        if($rider->email_verified_at)
            {
                return back();
            }

            Mail::to($rider->email)->queue(new RiderVerificationMail($rider, self::signedUrl($rider)));

            Inertia::flash('toast',['type' => 'success','message' => 'Verification email resent']);

            return back();

    }

    public static function signedUrl(User $rider) : string
    {
        return URL::temporarySignedRoute('rider.verify-email', now()->addDays(7),['id' =>$rider->id , 'hash' => sha1($rider->email)]);
    }
}
